const pool = require("../config/db");

async function createPdfDocument(file) {
  const result = await pool.query(
    `INSERT INTO pdf_documents (file_name, stored_file_name, file_path, file_data)
     VALUES ($1, $2, NULL, $3)
     RETURNING id, file_name, stored_file_name, template_name, created_at`,
    [file.originalname, file.originalname, file.buffer]
  );
  return result.rows[0];
}

async function getAllPdfDocuments() {
  const result = await pool.query(
    `SELECT id, file_name, stored_file_name, template_name, created_at
     FROM pdf_documents ORDER BY created_at DESC`
  );
  return result.rows;
}

async function getPdfDocumentById(id) {
  const result = await pool.query(
    `SELECT * FROM pdf_documents WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

async function updateFileData(id, buffer) {
  await pool.query(
    `UPDATE pdf_documents SET file_data = $1 WHERE id = $2`,
    [buffer, id]
  );
}

async function deletePdfDocument(id) {
  const result = await pool.query(
    `DELETE FROM pdf_documents WHERE id = $1 RETURNING id, file_name, stored_file_name`,
    [id]
  );
  return result.rows[0];
}

module.exports = {
  createPdfDocument,
  getAllPdfDocuments,
  getPdfDocumentById,
  updateFileData,
  deletePdfDocument,
};
