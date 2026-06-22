const templateService = require("../services/templateService");

async function exportTemplate(req, res, next) {
  try {
    const template = await templateService.exportTemplate(req.params.documentId);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="template-${req.params.documentId}-fields.json"`
    );
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(template);
  } catch (error) {
    next(error);
  }
}

async function importTemplate(req, res, next) {
  try {
    const pdfFile = req.files?.pdf?.[0];
    const fieldsJsonFile = req.files?.fields_json?.[0];

    const document = await templateService.importTemplate(pdfFile, fieldsJsonFile);

    res.status(201).json({
      success: true,
      message: "Template imported successfully",
      data: {
        ...document,
        file_url: `/api/pdf/${document.id}/file`,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { exportTemplate, importTemplate };
