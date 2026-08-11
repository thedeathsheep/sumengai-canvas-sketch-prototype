const smoothingFactors = { off: 1, low: 0.6, high: 0.35 };

export function normalizeOpacity(percent) {
  return Math.min(1, Math.max(0.1, Number(percent) / 100));
}

export function applyCanvasStrokeStyle(context, tool, style) {
  const isEraser = tool === "eraser";
  const character = isEraser
    ? { lineWidth: style.size, lineCap: "round", opacityFactor: 1 }
    : getBrushStrokeCharacter(
        tool === "pen" ? style.brushType : "pencil",
        style.size,
      );
  context.lineCap = character.lineCap;
  context.lineJoin = "round";
  context.lineWidth = character.lineWidth;
  context.strokeStyle = style.color ?? "#303238";
  context.globalAlpha = isEraser
    ? 1
    : normalizeOpacity(style.opacity) * character.opacityFactor;
  context.globalCompositeOperation = isEraser
    ? "destination-out"
    : "source-over";
}

export function getBrushStrokeCharacter(brushType, size) {
  const baseSize = Math.max(1, Number(size) || 1);
  const characters = {
    pencil: { widthFactor: 1, lineCap: "round", opacityFactor: 1 },
    brush: { widthFactor: 1.35, lineCap: "round", opacityFactor: 0.92 },
    stylus: { widthFactor: 0.85, lineCap: "round", opacityFactor: 1 },
    marker: { widthFactor: 2.4, lineCap: "square", opacityFactor: 0.58 },
  };
  const character = characters[brushType] ?? characters.pencil;
  return {
    lineWidth: Math.round(baseSize * character.widthFactor * 10) / 10,
    lineCap: character.lineCap,
    opacityFactor: character.opacityFactor,
  };
}

export function compositeDrawingCanvas(context, drawingCanvas, size) {
  context.save();
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.drawImage(drawingCanvas, 0, 0, size.width, size.height);
  context.restore();
}

export function getSmoothedPoint(previous, current, level) {
  const factor = smoothingFactors[level] ?? smoothingFactors.low;
  return {
    x: previous.x + (current.x - previous.x) * factor,
    y: previous.y + (current.y - previous.y) * factor,
  };
}

export function getRenderedPenPoint(
  previous,
  current,
  level,
  { isFinal = false } = {},
) {
  return isFinal ? { ...current } : getSmoothedPoint(previous, current, level);
}

export const getStraightLine = (start, end) => ({ start: { ...start }, end: { ...end } });

export function createDrawingGesture({
  tool,
  style,
  start,
  snapshot = null,
  historySnapshot = null,
}) {
  return {
    tool,
    style: { ...style },
    start: { ...start },
    last: { ...start },
    lastRendered: { ...start },
    snapshot,
    historySnapshot,
  };
}

export function getGestureCompletion(tool, eventType) {
  if (eventType === "pointercancel") return "cancel";
  if (["pen", "eraser"].includes(tool)) return "final-segment";
  if (["line", "arrow", "circle", "area"].includes(tool)) return "preview";
  return "none";
}
