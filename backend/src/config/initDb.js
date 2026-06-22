const pool = require("./db");

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pdf_documents (
      id SERIAL PRIMARY KEY,
      file_name TEXT NOT NULL,
      stored_file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      template_name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pdf_fields (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      field_type TEXT NOT NULL CHECK (field_type IN ('text', 'checkbox', 'signature')),
      page_number INTEGER NOT NULL,
      x_percent NUMERIC(10, 4) NOT NULL,
      y_percent NUMERIC(10, 4) NOT NULL,
      width_percent NUMERIC(10, 4) NOT NULL,
      height_percent NUMERIC(10, 4) NOT NULL,
      required BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pdf_responses (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
      field_id INTEGER NOT NULL REFERENCES pdf_fields(id) ON DELETE CASCADE,
      value TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(document_id, field_id)
    );
  `);

  // migration columns
  await pool.query(`ALTER TABLE pdf_documents ADD COLUMN IF NOT EXISTS template_name TEXT;`);
  await pool.query(`ALTER TABLE pdf_documents ADD COLUMN IF NOT EXISTS file_data BYTEA;`);
  // allow NULL file_path for DB-stored PDFs (old rows keep their value)
  await pool.query(`ALTER TABLE pdf_documents ALTER COLUMN file_path DROP NOT NULL;`).catch(() => {});

  console.log("✅ Database tables ready");
}

module.exports = initDb;
