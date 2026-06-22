import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCompletedForms, deletePdf, BACKEND_URL } from "../api/pdfApi";

function CompletedForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCompletedForms();
        setForms(data);
      } catch (e) {
        alert("Failed to load completed forms");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleView(form) {
    window.open(`${BACKEND_URL}/api/pdf/${form.id}/filled`, "_blank");
  }

  function handleDownload(form) {
    window.open(`${BACKEND_URL}/api/pdf/${form.id}/filled?download=1`, "_blank");
  }

  async function handleDelete(form) {
    const ok = confirm(
      `Delete "${form.template_name || form.file_name}" and all its fields and responses? This cannot be undone.`
    );
    if (!ok) return;
    try {
      await deletePdf(form.id);
      setForms((prev) => prev.filter((f) => f.id !== form.id));
    } catch (e) {
      alert("Failed to delete");
      console.error(e);
    }
  }

  if (loading) return <main className="page">Loading...</main>;

  return (
    <main className="page">
      <div className="top-line">
        <div>
          <h3>Completed Forms</h3>
          <p>PDFs that have been filled in</p>
        </div>
        <Link to="/" style={{ fontSize: 14 }}>← Back to Dashboard</Link>
      </div>

      {forms.length === 0 ? (
        <div className="card">
          <p style={{ color: "#6b7280" }}>
            No forms have been filled yet. Go to{" "}
            <Link to="/">Dashboard</Link> and click <strong>Fill Form</strong> on a PDF.
          </p>
        </div>
      ) : (
        <div className="document-list">
          {forms.map((form) => (
            <div className="document-row" key={form.id}>
              <div>
                <strong>{form.template_name || form.file_name}</strong>
                {form.template_name && (
                  <p style={{ fontSize: 12, color: "#6b7280" }}>{form.file_name}</p>
                )}
                <p>
                  Last filled: {new Date(form.last_filled_at).toLocaleString()}
                  &nbsp;·&nbsp;
                  {form.response_count} field{form.response_count !== 1 ? "s" : ""} filled
                </p>
              </div>

              <div className="actions">
                <Link to={`/fill/${form.id}`}>Edit Responses</Link>

                <button
                  onClick={() => handleView(form)}
                  style={{ background: "#059669" }}
                >
                  View Filled PDF
                </button>

                <button
                  onClick={() => handleDownload(form)}
                  style={{ background: "#2563eb" }}
                >
                  Download
                </button>

                <button
                  onClick={() => handleDelete(form)}
                  style={{ background: "#dc2626" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default CompletedForms;
