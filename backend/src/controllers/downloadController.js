const { generateFilledPdf } = require("../services/pdfGenerationService");

async function serveFilledPdf(req, res, next) {
  try {
    const documentId = req.params.documentId;
    const { pdfBytes, fileName } = await generateFilledPdf(documentId);

    const isDownload = req.query.download === "1";
    const disposition = isDownload ? "attachment" : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="filled-${fileName}"`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    next(error);
  }
}

module.exports = { serveFilledPdf };
