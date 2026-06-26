const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const pool = require("../config/db");
const { convertPercentToPdfCoordinates } = require("../utils/coordinateMapper");

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// Strip characters WinAnsi encoding cannot handle (e.g. tab 0x09, control chars).
// Tabs become 4 spaces; other non-printable control characters are removed.
function sanitizeText(text) {
  return String(text)
    .replace(/\r\n?/g, "\n")                            // normalize Windows line endings
    .replace(/\t/g, "    ")                              // tab → 4 spaces
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // strip remaining control chars
}

// Word-wrap a single line to fit within maxWidthPt points.
// Falls back to character-by-character breaking for words with no spaces.
function wrapLine(text, font, fontSize, maxWidthPt) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidthPt) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Break oversized single word character by character
      let remaining = word;
      while (font.widthOfTextAtSize(remaining, fontSize) > maxWidthPt) {
        let cut = remaining.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(remaining.slice(0, cut), fontSize) > maxWidthPt) {
          cut--;
        }
        lines.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut);
      }
      current = remaining;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function generateFilledPdf(documentId) {
  const docResult = await pool.query(
    `SELECT id, file_name, stored_file_name, file_data FROM pdf_documents WHERE id = $1`,
    [documentId]
  );

  const document = docResult.rows[0];
  if (!document) throw new Error("PDF document not found");

  let pdfBuffer;
  if (document.file_data) {
    pdfBuffer = document.file_data;
  } else {
    // Pre-migration fallback: read from local uploads folder
    const localPath = path.join(UPLOADS_DIR, document.stored_file_name);
    if (fs.existsSync(localPath)) {
      pdfBuffer = fs.readFileSync(localPath);
      // Lazy-migrate into DB in the background
      pool.query(
        `UPDATE pdf_documents SET file_data = $1 WHERE id = $2`,
        [pdfBuffer, document.id]
      ).catch(() => {});
    } else {
      throw new Error("PDF file not found on this server. Please re-upload the PDF.");
    }
  }

  const fieldResult = await pool.query(
    `SELECT f.*, r.value
     FROM pdf_fields f
     LEFT JOIN pdf_responses r ON f.id = r.field_id AND f.document_id = r.document_id
     WHERE f.document_id = $1
     ORDER BY f.page_number ASC, f.id ASC`,
    [documentId]
  );

  const fields = fieldResult.rows;

  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Flatten any existing AcroForm interactive fields so Acrobat doesn't render
  // the field widget annotations on top of our drawn text (which causes doubling).
  try {
    pdfDoc.getForm().flatten();
  } catch (_) {
    // PDF has no form fields — nothing to flatten
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const field of fields) {
    if (!field.value) continue;

    const pageIndex = Number(field.page_number) - 1;
    const page = pages[pageIndex];
    if (!page) continue;

    const coords = convertPercentToPdfCoordinates(field, page);

    if (field.field_type === "text") {
      const fontSize = 10;
      const lineHeight = fontSize * 1.4;
      const maxWidthPt = coords.width - 4;
      // Sanitize first (tabs, control chars), then split and word-wrap
      const inputLines = sanitizeText(field.value).split("\n");
      const allLines = inputLines.flatMap((l) => wrapLine(l, font, fontSize, maxWidthPt));
      let currentY = coords.y + coords.height - lineHeight + 2;
      for (const line of allLines) {
        if (currentY < coords.y) break;
        if (line.length > 0) {
          page.drawText(line, {
            x: coords.x + 2,
            y: currentY,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
        }
        currentY -= lineHeight;
      }
    }

    if (field.field_type === "checkbox") {
      const checked =
        field.value === true ||
        field.value === "true" ||
        field.value === "yes" ||
        field.value === "1";

      if (checked) {
        page.drawText("X", {
          x: coords.x + 2,
          y: coords.y,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    if (field.field_type === "signature") {
      const val = String(field.value);
      let imgBase64 = "";
      let sigCoords = coords;

      if (val.startsWith("data:image/")) {
        // Plain base64 (old format) — use template field position
        imgBase64 = val;
      } else {
        try {
          const parsed = JSON.parse(val);
          if (parsed.img) {
            imgBase64 = parsed.img;
            // Use the user-adjusted position/size stored in the JSON
            const { width: pageW, height: pageH } = page.getSize();
            const sigH = (parsed.h / 100) * pageH;
            sigCoords = {
              x: (parsed.x / 100) * pageW,
              y: pageH - (parsed.y / 100) * pageH - sigH,
              width: (parsed.w / 100) * pageW,
              height: sigH,
            };
          }
        } catch (_) {
          // Plain text signature (legacy)
          page.drawText(sanitizeText(val), { x: coords.x, y: coords.y + 4, size: 12, font, color: rgb(0, 0, 0) });
        }
      }

      if (imgBase64) {
        try {
          const base64Data = imgBase64.split(",")[1];
          const imageBytes = Buffer.from(base64Data, "base64");
          let embeddedImage;
          if (imgBase64.startsWith("data:image/png")) {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          }
          // Preserve aspect ratio (object-fit: contain)
          const naturalAspect = embeddedImage.width / embeddedImage.height;
          const boxAspect = sigCoords.width / sigCoords.height;
          let drawX = sigCoords.x, drawY = sigCoords.y;
          let drawWidth = sigCoords.width, drawHeight = sigCoords.height;
          if (naturalAspect > boxAspect) {
            drawHeight = sigCoords.width / naturalAspect;
            drawY = sigCoords.y + (sigCoords.height - drawHeight) / 2;
          } else {
            drawWidth = sigCoords.height * naturalAspect;
            drawX = sigCoords.x + (sigCoords.width - drawWidth) / 2;
          }
          page.drawImage(embeddedImage, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
        } catch (imgErr) {
          console.error("Failed to embed signature image for field", field.id, imgErr.message);
        }
      }
    }
  }

  const pdfBytes = await pdfDoc.save(); // Uint8Array
  return { pdfBytes, fileName: document.file_name };
}

module.exports = { generateFilledPdf };
