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
  await pool.query(`ALTER TABLE pdf_documents ALTER COLUMN file_path DROP NOT NULL;`).catch(() => {});

  // Remove duplicate pdf_responses rows before adding the unique constraint
  // (keeps the row with the highest id — the most recent save — per document+field pair)
  await pool.query(`
    DELETE FROM pdf_responses
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM pdf_responses
      GROUP BY document_id, field_id
    );
  `);

  // Add the unique constraint required by ON CONFLICT in saveResponses
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pdf_responses_doc_field_unique'
          AND conrelid = 'pdf_responses'::regclass
      ) THEN
        ALTER TABLE pdf_responses
          ADD CONSTRAINT pdf_responses_doc_field_unique
          UNIQUE (document_id, field_id);
      END IF;
    END $$;
  `);

  console.log("✅ Database tables ready");
}

module.exports = initDb;
