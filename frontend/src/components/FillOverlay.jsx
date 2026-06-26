import { useRef } from "react";

function SignatureBox({ field, value, onChange }) {
  const containerRef = useRef(null);

  // Parse stored value — plain base64 (old) or JSON with position info
  let imgSrc = "";
  let pos = {
    x: field.x_percent,
    y: field.y_percent,
    w: field.width_percent,
    h: field.height_percent,
  };

  if (value) {
    if (value.startsWith("data:image/")) {
      imgSrc = value;
    } else {
      try {
        const parsed = JSON.parse(value);
        if (parsed.img) {
          imgSrc = parsed.img;
          pos = { x: parsed.x, y: parsed.y, w: parsed.w, h: parsed.h };
        }
      } catch (_) {}
    }
  }

  function getPageRect() {
    return containerRef.current?.closest(".pdf-page-wrapper")?.getBoundingClientRect();
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onChange(
        field.id,
        JSON.stringify({
          img: ev.target.result,
          x: field.x_percent,
          y: field.y_percent,
          w: field.width_percent,
          h: field.height_percent,
        })
      );
    };
    reader.readAsDataURL(file);
  }

  function handleDragStart(e) {
    e.preventDefault();
    const pageRect = getPageRect();
    if (!pageRect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const snap = { ...pos };

    function onMove(me) {
      const dx = ((me.clientX - startX) / pageRect.width) * 100;
      const dy = ((me.clientY - startY) / pageRect.height) * 100;
      onChange(
        field.id,
        JSON.stringify({
          img: imgSrc,
          x: Math.max(0, Math.min(100 - snap.w, snap.x + dx)),
          y: Math.max(0, Math.min(100 - snap.h, snap.y + dy)),
          w: snap.w,
          h: snap.h,
        })
      );
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function handleResizeStart(e, dir) {
    e.preventDefault();
    e.stopPropagation();
    const pageRect = getPageRect();
    if (!pageRect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const snap = { ...pos };

    function onMove(me) {
      const dx = ((me.clientX - startX) / pageRect.width) * 100;
      const dy = ((me.clientY - startY) / pageRect.height) * 100;
      const next = { ...snap };

      if (dir.includes("e")) next.w = Math.max(5, snap.w + dx);
      if (dir.includes("w")) {
        next.w = Math.max(5, snap.w - dx);
        next.x = snap.x + snap.w - next.w;
      }
      if (dir.includes("s")) next.h = Math.max(2, snap.h + dy);
      if (dir.includes("n")) {
        next.h = Math.max(2, snap.h - dy);
        next.y = snap.y + snap.h - next.h;
      }
      onChange(field.id, JSON.stringify({ img: imgSrc, ...next }));
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const style = {
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    width: `${pos.w}%`,
    height: `${pos.h}%`,
  };

  return (
    <div ref={containerRef} className="pdf-sig-box" style={style} onMouseDown={handleDragStart}>
      {imgSrc ? (
        <>
          <img
            src={imgSrc}
            alt="signature"
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "fill",
              display: "block",
              cursor: "move",
              userSelect: "none",
            }}
          />
          <button
            className="sig-clear-btn"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onChange(field.id, "")}
            title="Remove signature"
          >
            ×
          </button>
          {["nw", "ne", "sw", "se", "n", "s", "e", "w"].map((dir) => (
            <div
              key={dir}
              className={`resize-handle ${dir}`}
              onMouseDown={(e) => handleResizeStart(e, dir)}
            />
          ))}
        </>
      ) : (
        <label className="sig-upload-label">
          <input
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          📎 Upload Signature
        </label>
      )}
    </div>
  );
}

function FillOverlay({ fields, responses, onChange }) {
  return (
    <div className="overlay fill-overlay">
      {fields.map((field) => {
        const style = {
          left: `${field.x_percent}%`,
          top: `${field.y_percent}%`,
          width: `${field.width_percent}%`,
          height: `${field.height_percent}%`,
        };

        if (field.field_type === "checkbox") {
          return (
            <input
              key={field.id}
              className="pdf-checkbox"
              type="checkbox"
              style={style}
              checked={responses[field.id] === "true"}
              onChange={(e) =>
                onChange(field.id, e.target.checked ? "true" : "false")
              }
            />
          );
        }

        if (field.field_type === "signature") {
          return (
            <SignatureBox
              key={field.id}
              field={field}
              value={responses[field.id] || ""}
              onChange={onChange}
            />
          );
        }

        return (
          <textarea
            key={field.id}
            className="pdf-input pdf-textarea"
            style={style}
            placeholder=""
            value={responses[field.id] || ""}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
        );
      })}
    </div>
  );
}

export default FillOverlay;
