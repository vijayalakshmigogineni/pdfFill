import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPdfById, getFields, saveFields, deleteField } from "../api/pdfApi";
import MarkerToolbar from "../components/MarkerToolbar";
import PdfCanvas from "../components/PdfCanvas";
import MarkerOverlay from "../components/MarkerOverlay";
import FieldSidebar from "../components/FieldSidebar";

const DEFAULT_SIZES = {
  text: { width_percent: 22, height_percent: 3.5 },
  checkbox: { width_percent: 3, height_percent: 3 },
  signature: { width_percent: 25, height_percent: 5 },
};

// Returns the 1-based page number most visible in the viewport right now
function getVisiblePage() {
  const wrappers = document.querySelectorAll(".pdf-page-wrapper");
  let bestPage = 1;
  let bestVisible = 0;

  wrappers.forEach((wrapper, i) => {
    const rect = wrapper.getBoundingClientRect();
    const visibleTop = Math.max(0, rect.top);
    const visibleBottom = Math.min(window.innerHeight, rect.bottom);
    const visible = Math.max(0, visibleBottom - visibleTop);
    if (visible > bestVisible) {
      bestVisible = visible;
      bestPage = i + 1;
    }
  });

  return bestPage;
}

function TemplateBuilder() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [pdf, setPdf] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastSizes, setLastSizes] = useState({ ...DEFAULT_SIZES });
  const [newFieldTempId, setNewFieldTempId] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      const pdfData = await getPdfById(documentId);
      const existingFields = await getFields(documentId);
      setPdf(pdfData);
      setFields(existingFields);
    } catch (error) {
      alert("Failed to load PDF");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [documentId]);

  function handleAddField(type) {
    const page = getVisiblePage();
    const tempId = crypto.randomUUID();
    const size = lastSizes[type];

    const newField = {
      temp_id: tempId,
      field_name: `${type}_field`,
      field_type: type,
      page_number: page,
      x_percent: (100 - size.width_percent) / 2,
      y_percent: 10,
      width_percent: size.width_percent,
      height_percent: size.height_percent,
      required: false,
      isNew: true,
    };

    setFields((prev) => [...prev, newField]);
    setCurrentPage(page);
    setNewFieldTempId(tempId);
  }

  function handleUpdateField(updatedField) {
    setFields((prev) =>
      prev.map((f) =>
        (f.temp_id && f.temp_id === updatedField.temp_id) ||
        (f.id && f.id === updatedField.id)
          ? { ...updatedField, isNew: f.isNew }
          : f
      )
    );
  }

  function handleSizeChange(type, width_percent, height_percent) {
    setLastSizes((prev) => ({ ...prev, [type]: { width_percent, height_percent } }));
  }

  async function handleSaveFields() {
    try {
      const newFields = fields.filter((f) => f.isNew);

      if (newFields.length === 0) {
        alert("No new fields to save");
        return;
      }

      const payload = newFields.map((field) => ({
        field_name: field.field_name,
        field_type: field.field_type,
        page_number: field.page_number,
        x_percent: field.x_percent,
        y_percent: field.y_percent,
        width_percent: field.width_percent,
        height_percent: field.height_percent,
        required: field.required,
      }));

      await saveFields(documentId, payload);
      alert("Fields saved successfully");
      loadData();
    } catch (error) {
      alert("Failed to save fields");
      console.error(error);
    }
  }

  async function handleDeleteField(field) {
    const ok = confirm(`Delete field "${field.field_name}"?`);
    if (!ok) return;

    if (field.isNew) {
      setFields((prev) => prev.filter((item) => item.temp_id !== field.temp_id));
      return;
    }

    try {
      await deleteField(field.id);
      setFields((prev) => prev.filter((item) => item.id !== field.id));
    } catch (error) {
      alert("Failed to delete field");
      console.error(error);
    }
  }

  if (loading) return <main className="page">Loading...</main>;
  if (!pdf) return <main className="page">PDF not found</main>;

  return (
    <main className="page">
      <div className="top-line">
        <div>
          <h3>Template Builder</h3>
          <p>{pdf.file_name}</p>
        </div>
        <button onClick={() => navigate("/")}>Back</button>
      </div>

      <MarkerToolbar
        onAddField={handleAddField}
        onSave={handleSaveFields}
        onGoToFill={() => navigate(`/fill/${documentId}`)}
        currentPage={currentPage}
        numPages={numPages}
        onPageChange={setCurrentPage}
      />

      <div className="builder-body">
        <FieldSidebar
          fields={fields}
          onUpdate={handleUpdateField}
          onDelete={handleDeleteField}
          focusId={newFieldTempId}
        />

        <div className="builder-pdf">
          <PdfCanvas
            fileUrl={pdf.file_url}
            onDocumentLoad={setNumPages}
            renderOverlay={(pageNumber, pageSize) => (
              <MarkerOverlay
                fields={fields.filter((field) => field.page_number === pageNumber)}
                pageSize={pageSize}
                onDelete={handleDeleteField}
                onUpdate={handleUpdateField}
                onSizeChange={handleSizeChange}
              />
            )}
          />
        </div>
      </div>
    </main>
  );
}

export default TemplateBuilder;
