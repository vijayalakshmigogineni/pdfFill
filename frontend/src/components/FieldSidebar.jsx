import { useRef, useEffect } from "react";

function FieldSidebar({ fields, onUpdate, onDelete, focusId }) {
  const inputRefs = useRef({});

  // When a new field is added, scroll it into view and focus its input
  useEffect(() => {
    if (!focusId) return;
    const el = inputRefs.current[focusId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.focus();
      el.select();
    }
  }, [focusId]);

  // Group fields by page number
  const byPage = fields.reduce((acc, f) => {
    const p = f.page_number || 1;
    if (!acc[p]) acc[p] = [];
    acc[p].push(f);
    return acc;
  }, {});

  const pages = Object.keys(byPage)
    .map(Number)
    .sort((a, b) => a - b);

  const typeLabel = { text: "T", checkbox: "☑", signature: "✍" };

  return (
    <div className="field-sidebar">
      <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>Fields</h4>

      {fields.length === 0 && (
        <p style={{ fontSize: 12, color: "#6b7280" }}>
          No fields yet. Click + Text Field, + Checkbox, or + Signature to add one.
        </p>
      )}

      {pages.map((page) => (
        <div key={page}>
          <p className="sidebar-page-label">Page {page}</p>

          {byPage[page].map((field) => {
            const key = field.id || field.temp_id;
            const isNew = field.isNew;

            return (
              <div
                key={key}
                className="sidebar-field-row"
                style={
                  isNew && key === focusId
                    ? { background: "#eff6ff", borderRadius: 4, padding: "2px 0" }
                    : {}
                }
              >
                <span className={`sidebar-type-badge ${field.field_type}`}>
                  {typeLabel[field.field_type] || "T"}
                </span>

                <input
                  ref={(el) => {
                    if (el) inputRefs.current[key] = el;
                  }}
                  className="sidebar-field-input"
                  value={field.field_name}
                  onChange={(e) =>
                    onUpdate({ ...field, field_name: e.target.value })
                  }
                  placeholder="Field name"
                />

                <button
                  className="sidebar-delete-btn"
                  onClick={() => onDelete(field)}
                  title="Delete field"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default FieldSidebar;
