const express = require("express");
const upload = require("../middleware/uploadMiddleware");

const {
  uploadPdf,
  getAllPdfs,
  getPdfById,
  servePdfFile,
  deletePdf,
} = require("../controllers/pdfController");

const { serveFilledPdf } = require("../controllers/downloadController");

const {
  exportTemplate,
  importTemplate,
} = require("../controllers/templateController");

const router = express.Router();

router.post("/upload", upload.single("pdf"), uploadPdf);

router.post(
  "/import-template",
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "fields_json", maxCount: 1 },
  ]),
  importTemplate
);

router.get("/", getAllPdfs);

// specific sub-routes before the generic /:id catch-all
router.get("/:id/file", servePdfFile);
router.get("/:documentId/filled", serveFilledPdf);
router.get("/:documentId/export-template", exportTemplate);

router.get("/:id", getPdfById);
router.delete("/:id", deletePdf);

// kept for backwards compat (DownloadButton used POST /generate previously)
router.post("/:documentId/generate", serveFilledPdf);

module.exports = router;
