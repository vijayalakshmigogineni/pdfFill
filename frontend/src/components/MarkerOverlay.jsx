import { useState, useRef } from "react";

function FieldBox({ field, onDelete, onUpdate, onSizeChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(field.field_name);
  const boxRef = useRef(null);

  function getContainerRect() {
    return boxRef.current?.parentElement?.getBoundingClientRect();
  }

  function findTargetPage(cursorY) {
    const wrappers = document.querySelectorAll(".pdf-page-wrapper");
    for (let i = 0; i < wrappers.length; i++) {
      const r = wrappers[i].getBoundingClientRect();
      if (cursorY >= r.top && cursorY <= r.bottom) return { pageNum: i + 1, rect: r };
    }
    let best = { pageNum: 1, rect: null, dist: Infinity };
    wrappers.forEach((w, i) => {
      const r = w.getBoundingClientRect();
      const dist = Math.min(Math.abs(cursorY - r.top), Math.abs(cursorY - r.bottom));
      if (dist < best.dist) best = { pageNum: i + 1, rect: r, dist };
    });
    return { pageNum: best.pageNum, rect: best.rect };
  }

  function handleDragStart(e) {
    if (isEditing) return;
    e.preventDefault();
    e.stopPropagation();

    const widthPercent = field.width_percent;
    const heightPercent = field.height_percent;
    const containerRect = getContainerRect();
    if (!containerRect) return;

    const boxLeftPx = containerRect.left + (field.x_percent / 100) * containerRect.width;
    const boxTopPx  = containerRect.top  + (field.y_percent / 100) * containerRect.height;
    const offsetX = e.clientX - boxLeftPx;
    const offsetY = e.clientY - boxTopPx;

    function onMove(e) {
      const { pageNum, rect } = findTargetPage(e.clientY);
      if (!rect) return;
      const newX = ((e.clientX - offsetX - rect.left) / rect.width)  * 100;
      const newY = ((e.clientY - offsetY - rect.top)  / rect.height) * 100;
      onUpdate({
        ...field,
        page_number: pageNum,
        x_percent: Math.max(0, Math.min(100 - widthPercent, newX)),
        y_percent: Math.max(0, Math.min(100 - heightPercent, newY)),
      });
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  /**
   * direction: any combination of n/s/e/w or corner combos nw/ne/sw/se
   *   n  → top edge only   (y + height change, x/width fixed)
   *   s  → bottom edge only (height changes, x/y/width fixed)
   *   w  → left edge only  (x + width change, y/height fixed)
   *   e  → right edge only (width changes, x/y/height fixed)
   *   nw/ne/sw/se → corner (two axes at once)
   */
  function handleResizeStart(e, direction) {
    e.preventDefault();
    e.stopPropagation();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = field.x_percent;
    const startY = field.y_percent;
    const startW = field.width_percent;
    const startH = field.height_percent;

    const movesLeft   = direction.includes("w");
    const movesRight  = direction.includes("e");
    const movesTop    = direction.includes("n");
    const movesBottom = direction.includes("s");

    function onMove(e) {
      const rect = getContainerRect();
      if (!rect) return;

      const dx = ((e.clientX - startMouseX) / rect.width)  * 100;
      const dy = ((e.clientY - startMouseY) / rect.height) * 100;

      let newX = startX, newY = startY, newW = startW, newH = startH;

      if (movesLeft) {
        newW = Math.max(1.5, startW - dx);
        newX = Math.max(0, startX + startW - newW);
      } else if (movesRight) {
        newW = Math.max(1.5, startW + dx);
      }

      if (movesTop) {
        newH = Math.max(1.5, startH - dy);
        newY = Math.max(0, startY + startH - newH);
      } else if (movesBottom) {
        newH = Math.max(1.5, startH + dy);
      }

      const updated = { ...field, x_percent: newX, y_percent: newY, width_percent: newW, height_percent: newH };
      onUpdate(updated);
      onSizeChange(field.field_type, newW, newH);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function commitName() {
    setIsEditing(false);
    if (editName.trim()) onUpdate({ ...field, field_name: editName.trim() });
  }

  const typeClass =
    field.field_type === "checkbox" ? "checkbox" :
    field.field_type === "signature" ? "signature" : "";

  return (
    <div
      ref={boxRef}
      className={`marker-box ${typeClass}`}
      style={{
        left: `${field.x_percent}%`,
        top:  `${field.y_percent}%`,
        width:  `${field.width_percent}%`,
        height: `${field.height_percent}%`,
        cursor: "move",
        userSelect: "none",
      }}
      onMouseDown={handleDragStart}
    >
      {isEditing ? (
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && commitName()}
          onClick={(e) => e.stopPropagation()}
          style={{ width:"100%", height:"100%", border:"none", background:"transparent", fontSize:10, padding:0, outline:"none", color:"inherit", fontWeight:"bold" }}
        />
      ) : (
        <span
          title="Double-click to rename"
          style={{ display:"block", lineHeight:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}
          onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditName(field.field_name); }}
        >
          {field.field_name}
        </span>
      )}

      {/* Delete */}
      <button
        className="delete-marker"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(field); }}
      >×</button>

      {/* 4 corners */}
      <div className="resize-handle nw" onMouseDown={(e) => handleResizeStart(e, "nw")} />
      <div className="resize-handle ne" onMouseDown={(e) => handleResizeStart(e, "ne")} />
      <div className="resize-handle sw" onMouseDown={(e) => handleResizeStart(e, "sw")} />
      <div className="resize-handle se" onMouseDown={(e) => handleResizeStart(e, "se")} />

      {/* 4 edges */}
      <div className="resize-handle n"  onMouseDown={(e) => handleResizeStart(e, "n")}  />
      <div className="resize-handle s"  onMouseDown={(e) => handleResizeStart(e, "s")}  />
      <div className="resize-handle e"  onMouseDown={(e) => handleResizeStart(e, "e")}  />
      <div className="resize-handle w"  onMouseDown={(e) => handleResizeStart(e, "w")}  />
    </div>
  );
}

function MarkerOverlay({ fields, pageSize, onDelete, onUpdate, onSizeChange }) {
  if (!pageSize) return null;
  return (
    <div className="overlay">
      {fields.map((field) => (
        <FieldBox
          key={field.id || field.temp_id}
          field={field}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onSizeChange={onSizeChange}
        />
      ))}
    </div>
  );
}

export default MarkerOverlay;
