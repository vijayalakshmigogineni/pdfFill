const pool = require("../config/db");

async function exportTemplate(documentId) {
  const docResult = await pool.query(
    `SELECT * FROM pdf_documents WHERE id = $1`,
    [documentId]
  );

  const document = docResult.rows[0];
  if (!document) throw new Error("PDF document not found");

  const fieldResult = await pool.query(
    `SELECT field_name, field_type, page_number,
            x_percent, y_percent, width_percent, height_percent, required
     FROM pdf_fields
     WHERE document_id = $1
     ORDER BY page_number ASC, id ASC`,
    [documentId]
  );

  return {
    template_name: document.template_name || document.file_name,
    template_version: "1.0",
    original_file_name: document.file_name,
    fields: fieldResult.rows,
  };
}

async function importTemplate(pdfFile, fieldsJsonFile) {
  if (!pdfFile) throw new Error("PDF file is required");
  if (!fieldsJsonFile) throw new Error("fields.json file is required");

  const rawJson = fieldsJsonFile.buffer.toString("utf-8");
  const templateData = JSON.parse(rawJson);

  const docResult = await pool.query(
    `INSERT INTO pdf_documents (file_name, stored_file_name, file_path, file_data, template_name)
     VALUES ($1, $2, NULL, $3, $4)
     RETURNING id, file_name, stored_file_name, template_name, created_at`,
    [
      pdfFile.originalname,
      pdfFile.originalname,
      pdfFile.buffer,
      templateData.template_name || pdfFile.originalname,
    ]
  );

  const document = docResult.rows[0];

  for (const field of templateData.fields || []) {
    await pool.query(
      `INSERT INTO pdf_fields
       (document_id, field_name, field_type, page_number,
        x_percent, y_percent, width_percent, height_percent, required)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        document.id,
        field.field_name,
        field.field_type,
        field.page_number,
        field.x_percent,
        field.y_percent,
        field.width_percent,
        field.height_percent,
        field.required || false,
      ]
    );
  }

  return document;
}

module.exports = {
  exportTemplate,
  importTemplate,
};
