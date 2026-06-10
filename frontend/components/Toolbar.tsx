import React from "react";
import { DrawingSettings, Tool } from "../types";
import "../styles/toolbar.css";

interface ToolbarProps {
  settings: DrawingSettings;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: "select", icon: "bi-cursor", label: "Select" },
  { id: "pencil", icon: "bi-pencil", label: "Pencil" },
  { id: "line", icon: "bi-slash-lg", label: "Line" },
  { id: "rect", icon: "bi-square", label: "Rectangle" },
  { id: "circle", icon: "bi-circle", label: "Circle" },
  { id: "text", icon: "bi-fonts", label: "Text" },
  { id: "eraser", icon: "bi-eraser", label: "Eraser" },
];

const PRESET_COLORS = [
  "#000000", "#ffffff", "#e05561", "#f5a623",
  "#f7dc6f", "#3dd68c", "#45b7d1", "#5b63f5",
  "#bb8fce", "#85c1e9",
];

const BRUSH_SIZES = [2, 4, 8, 16];

const Toolbar: React.FC<ToolbarProps> = ({
  settings,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onClear,
  onExportPng,
  onExportPdf,
  canUndo,
  canRedo,
}) => {
  return (
    <div className="toolbar">
      {/* Tools */}
      <div className="toolbar-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`toolbar-btn ${settings.tool === t.id ? "active" : ""}`}
            onClick={() => onToolChange(t.id)}
            title={t.label}
          >
            <i className={`bi ${t.icon}`} />
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {/* Color picker */}
      <div className="toolbar-group">
        <div className="color-swatches">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${settings.color === c ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => onColorChange(c)}
              title={c}
            />
          ))}
        </div>
        <div className="color-picker-wrap" title="Custom color">
          <input
            type="color"
            value={settings.color}
            onChange={(e) => onColorChange(e.target.value)}
            className="color-picker-input"
          />
          <i className="bi bi-eyedropper" />
        </div>
      </div>

      <div className="toolbar-divider" />

      {/* Brush size */}
      <div className="toolbar-group">
        {BRUSH_SIZES.map((size) => (
          <button
            key={size}
            className={`toolbar-btn size-btn ${settings.brushSize === size ? "active" : ""}`}
            onClick={() => onBrushSizeChange(size)}
            title={`${size}px`}
          >
            <span
              className="size-dot"
              style={{ width: size + 2, height: size + 2 }}
            />
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {/* History */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <i className="bi bi-arrow-counterclockwise" />
        </button>
        <button
          className="toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <i className="bi bi-arrow-clockwise" />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Export */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onExportPng} title="Export as PNG">
          <i className="bi bi-image" />
        </button>
        <button className="toolbar-btn" onClick={onExportPdf} title="Export as PDF">
          <i className="bi bi-file-pdf" />
        </button>
        <button className="toolbar-btn danger" onClick={onClear} title="Clear board">
          <i className="bi bi-trash" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;