import { useEffect, useRef, useState, useCallback } from "react";
import { fabric } from "fabric";
import { DrawingSettings, HistoryEntry, Tool } from "../types";
import { getSocket } from "../services/socket";

const CANVAS_SAVE_INTERVAL = 5000; // autosave every 5s

interface UseWhiteboardOptions {
  sessionId: string;
  onSave: (state: object) => void;
}

interface UseWhiteboardReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  settings: DrawingSettings;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearCanvas: () => void;
  exportAsPng: () => void;
  exportAsPdf: () => void;
}

export const useWhiteboard = ({
  sessionId,
  onSave,
}: UseWhiteboardOptions): UseWhiteboardReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const isRemoteActionRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [settings, setSettings] = useState<DrawingSettings>({
    tool: "pencil",
    color: "#000000",
    brushSize: 4,
  });

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback(() => {
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    // Trim any redo states ahead of current position
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push({ json });
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Apply tool/color/size to the fabric canvas
  const applySettings = useCallback((canvas: fabric.Canvas, s: DrawingSettings) => {
    if (s.tool === "pencil" || s.tool === "eraser") {
      canvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(canvas);
      brush.color = s.tool === "eraser" ? "#f8f8f8" : s.color;
      brush.width = s.tool === "eraser" ? s.brushSize * 3 : s.brushSize;
      canvas.freeDrawingBrush = brush;
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = s.tool === "select";
    }
  }, []);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: "#f8f8f8",
      selection: false,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Initial history snapshot
    pushHistory();

    // Track object changes for history
    const onModified = () => {
      if (!isRemoteActionRef.current) {
        pushHistory();
        broadcastAction(canvas, "modified");
      }
    };

    canvas.on("object:added", () => {
      if (!isRemoteActionRef.current) {
        broadcastAction(canvas, "added");
      }
    });
    canvas.on("object:modified", onModified);
    canvas.on("object:removed", onModified);

    // Auto-save
    saveTimerRef.current = setInterval(() => {
      if (fabricRef.current) {
        onSave(fabricRef.current.toJSON());
      }
    }, CANVAS_SAVE_INTERVAL);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep settings in sync with canvas
  useEffect(() => {
    if (fabricRef.current) {
      applySettings(fabricRef.current, settings);
    }
  }, [settings, applySettings]);

  // Tool for adding shapes on click
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (settings.tool === "rect" || settings.tool === "circle" || settings.tool === "line" || settings.tool === "text") {
      let isDown = false;
      let startX = 0;
      let startY = 0;
      let shape: fabric.Object | null = null;

      const onMouseDown = (opt: fabric.IEvent) => {
        isDown = true;
        const pointer = canvas.getPointer(opt.e);
        startX = pointer.x;
        startY = pointer.y;

        if (settings.tool === "text") {
          const text = new fabric.IText("Type here", {
            left: startX,
            top: startY,
            fontSize: 18,
            fill: settings.color,
            fontFamily: "Inter, sans-serif",
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          isDown = false;
          pushHistory();
          return;
        }

        if (settings.tool === "rect") {
          shape = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: "transparent",
            stroke: settings.color,
            strokeWidth: settings.brushSize,
          });
        } else if (settings.tool === "circle") {
          shape = new fabric.Ellipse({
            left: startX,
            top: startY,
            rx: 0,
            ry: 0,
            fill: "transparent",
            stroke: settings.color,
            strokeWidth: settings.brushSize,
          });
        } else if (settings.tool === "line") {
          shape = new fabric.Line([startX, startY, startX, startY], {
            stroke: settings.color,
            strokeWidth: settings.brushSize,
          });
        }

        if (shape) canvas.add(shape);
      };

      const onMouseMove = (opt: fabric.IEvent) => {
        if (!isDown || !shape) return;
        const pointer = canvas.getPointer(opt.e);
        const w = pointer.x - startX;
        const h = pointer.y - startY;

        if (settings.tool === "rect") {
          (shape as fabric.Rect).set({
            width: Math.abs(w),
            height: Math.abs(h),
            left: w < 0 ? pointer.x : startX,
            top: h < 0 ? pointer.y : startY,
          });
        } else if (settings.tool === "circle") {
          (shape as fabric.Ellipse).set({
            rx: Math.abs(w) / 2,
            ry: Math.abs(h) / 2,
            left: w < 0 ? pointer.x : startX,
            top: h < 0 ? pointer.y : startY,
          });
        } else if (settings.tool === "line") {
          (shape as fabric.Line).set({ x2: pointer.x, y2: pointer.y });
        }

        canvas.requestRenderAll();
      };

      const onMouseUp = () => {
        isDown = false;
        shape = null;
        pushHistory();
        broadcastAction(canvas, "shape_added");
      };

      canvas.on("mouse:down", onMouseDown);
      canvas.on("mouse:move", onMouseMove);
      canvas.on("mouse:up", onMouseUp);

      return () => {
        canvas.off("mouse:down", onMouseDown);
        canvas.off("mouse:move", onMouseMove);
        canvas.off("mouse:up", onMouseUp);
      };
    }
  }, [settings.tool, settings.color, settings.brushSize, pushHistory]);

  // Socket: receive remote canvas actions
  useEffect(() => {
    const socket = getSocket();

    const handleRemoteAction = (data: { action: string; payload: Record<string, unknown> }) => {
      if (!fabricRef.current) return;
      isRemoteActionRef.current = true;

      if (data.action === "full_state" && data.payload.json) {
        fabricRef.current.loadFromJSON(data.payload.json as object, () => {
          fabricRef.current?.requestRenderAll();
        });
      }

      isRemoteActionRef.current = false;
    };

    socket.on("canvas:action", handleRemoteAction);
    return () => { socket.off("canvas:action", handleRemoteAction); };
  }, []);

  const broadcastAction = (canvas: fabric.Canvas, action: string) => {
    const socket = getSocket();
    socket.emit("canvas:action", {
      sessionId,
      action,
      payload: { json: canvas.toJSON() },
    });
  };

  const setTool = (tool: Tool) =>
    setSettings((prev) => ({ ...prev, tool }));

  const setColor = (color: string) =>
    setSettings((prev) => ({ ...prev, color }));

  const setBrushSize = (brushSize: number) =>
    setSettings((prev) => ({ ...prev, brushSize }));

  const undo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;

    historyIndexRef.current--;
    const entry = historyRef.current[historyIndexRef.current];

    isRemoteActionRef.current = true;
    canvas.loadFromJSON(JSON.parse(entry.json) as object, () => {
      canvas.requestRenderAll();
      isRemoteActionRef.current = false;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      broadcastAction(canvas, "full_state");
    });
  }, []);

  const redo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current];

    isRemoteActionRef.current = true;
    canvas.loadFromJSON(JSON.parse(entry.json) as object, () => {
      canvas.requestRenderAll();
      isRemoteActionRef.current = false;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      broadcastAction(canvas, "full_state");
    });
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.setBackgroundColor("#f8f8f8", () => canvas.requestRenderAll());
    pushHistory();
    broadcastAction(canvas, "full_state");
  }, [pushHistory]);

  const exportAsPng = useCallback(() => {
    if (!fabricRef.current) return;
    const dataUrl = fabricRef.current.toDataURL({ format: "png", multiplier: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `collabboard-${sessionId.slice(0, 8)}.png`;
    a.click();
  }, [sessionId]);

  const exportAsPdf = useCallback(async () => {
    if (!fabricRef.current) return;
    const { jsPDF } = await import("jspdf");
    const dataUrl = fabricRef.current.toDataURL({ format: "png", multiplier: 2 });
    const width = fabricRef.current.getWidth();
    const height = fabricRef.current.getHeight();

    const pdf = new jsPDF({
      orientation: width > height ? "landscape" : "portrait",
      unit: "px",
      format: [width, height],
    });

    pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
    pdf.save(`collabboard-${sessionId.slice(0, 8)}.pdf`);
  }, [sessionId]);

  return {
    canvasRef,
    settings,
    setTool,
    setColor,
    setBrushSize,
    undo,
    redo,
    canUndo,
    canRedo,
    clearCanvas,
    exportAsPng,
    exportAsPdf,
  };
};