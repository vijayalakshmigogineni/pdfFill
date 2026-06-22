const fs = require("fs");
const path = require("path");
const pdfService = require("../services/pdfService");

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

function getPdfBufferFromDisk(storedFileName) {
  const filePath = path.join(UPLOADS_DIR, storedFileName);
  if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
  return null;
}

async function uploadPdf(req, res, next) {
  try {
    if (!req.file) throw new Error("PDF file is required");

    const document = await pdfService.createPdfDocument(req.file);

    res.status(201).json({
      success: true,
      data: {
        ...document,
        file_url: `/api/pdf/${document.id}/file`,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAllPdfs(req, res, next) {
  try {
    const documents = await pdfService.getAllPdfDocuments();

    const data = documents.map((doc) => ({
      ...doc,
      file_url: `/api/pdf/${doc.id}/file`,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getPdfById(req, res, next) {
  try {
    const document = await pdfService.getPdfDocumentById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: "PDF not found" });
    }

    res.json({
      success: true,
      data: {
        ...document,
        file_data: undefined, // never send binary to frontend
        file_url: `/api/pdf/${document.id}/file`,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function servePdfFile(req, res, next) {
  try {
    const document = await pdfService.getPdfDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: "PDF not found" });
    }

    let pdfBuffer;

    if (document.file_data) {
      pdfBuffer = Buffer.from(document.file_data);
    } else {
      // Pre-migration fallback: read from local uploads folder
      pdfBuffer = getPdfBufferFromDisk(document.stored_file_name);
      if (!pdfBuffer) {
        return res.status(404).json({
          success: false,
          message: "PDF file not found on this server. Please re-upload the PDF.",
        });
      }
      // Lazy-migrate: store in DB so subsequent requests don't need disk
      pdfService.updateFileData(document.id, pdfBuffer).catch(() => {});
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${document.file_name}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

async function deletePdf(req, res, next) {
  try {
    const document = await pdfService.deletePdfDocument(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: "PDF not found" });
    }

    res.json({ success: true, message: "PDF deleted" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadPdf,
  getAllPdfs,
  getPdfById,
  servePdfFile,
  deletePdf,
};
