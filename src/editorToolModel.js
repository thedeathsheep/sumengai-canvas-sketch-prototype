import { normalizeRangeValue } from "./numericRange.js";

export const primaryToolGroups = [
  {
    id: "tools",
    tools: [
      { id: "select", label: "选择", shortcut: "V" },
      { id: "pen", label: "画笔", shortcut: "P" },
      { id: "eraser", label: "橡皮", shortcut: "E" },
      { id: "line", label: "直线", shortcut: "L" },
      { id: "arrow", label: "箭头", shortcut: "A" },
      { id: "shape", label: "形状", toolIds: ["circle", "area"] },
      { id: "text", label: "文字", shortcut: "T" },
    ],
  },
  {
    id: "content",
    tools: [
      { id: "image", label: "图片" },
      { id: "elements", label: "元素" },
    ],
  },
];

export const brushTypes = [
  { id: "pencil", label: "铅笔" },
  { id: "brush", label: "毛笔" },
  { id: "stylus", label: "触控笔" },
  { id: "marker", label: "记号笔" },
];

export const stabilizerOptions = [
  { id: "off", label: "关" },
  { id: "low", label: "低" },
  { id: "high", label: "高" },
];

const strokeStyle = (color, size) => ({ color, size, opacity: 100 });

export function createInitialToolSession({ hasImageBackground }) {
  return {
    activeTool: hasImageBackground ? "select" : "pen",
    lastShapeTool: "circle",
    styles: {
      pen: {
        ...strokeStyle(hasImageBackground ? "#ef4154" : "#303238", 3),
        smoothing: "low",
        brushType: "pencil",
      },
      eraser: { size: 24 },
      line: strokeStyle("#303238", 3),
      arrow: strokeStyle("#ef4154", 4),
      circle: strokeStyle("#ef4154", 4),
      area: strokeStyle("#ef4154", 4),
      text: { color: "#ef4154", size: "medium" },
    },
  };
}

export function selectBrushType(session, brushType) {
  if (!brushTypes.some((option) => option.id === brushType)) return session;
  return {
    ...session,
    activeTool: "pen",
    styles: {
      ...session.styles,
      pen: { ...session.styles.pen, brushType },
    },
  };
}

export function getRelevantControls({ activeTool, selectedKind }) {
  if (selectedKind === "text") return ["color", "text-size", "object-actions"];
  if (selectedKind === "media" || selectedKind === "figure") return ["object-actions"];
  if (activeTool === "pen") return ["color", "size", "opacity", "smoothing"];
  if (["line", "arrow", "circle", "area"].includes(activeTool)) return ["color", "size", "opacity"];
  if (activeTool === "eraser") return ["eraser-size"];
  if (activeTool === "text") return ["color", "text-size"];
  return [];
}

export function getToolButtonState({
  toolId,
  activeTool,
  imageBrowserOpen = false,
  libraryOpen = false,
}) {
  if (toolId === "shape") return activeTool === "circle" || activeTool === "area";
  if (toolId === "image") return imageBrowserOpen;
  if (toolId === "elements") return libraryOpen;
  return toolId === activeTool;
}

export function updateToolStyle(session, tool, patch) {
  const nextPatch = { ...patch };
  const isStrokeTool = ["pen", "line", "arrow", "circle", "area"].includes(tool);
  if ((isStrokeTool || tool === "eraser") && "size" in nextPatch) {
    const [min, max] = tool === "eraser" ? [8, 80] : [1, 24];
    const normalized = normalizeRangeValue(nextPatch.size, {
      min,
      max,
      step: 1,
      fallback: session.styles[tool].size,
    });
    if (normalized === session.styles[tool].size && !Number.isFinite(Number(nextPatch.size))) {
      delete nextPatch.size;
    } else if (typeof nextPatch.size === "string" && nextPatch.size.trim() === "") {
      delete nextPatch.size;
    } else {
      nextPatch.size = normalized;
    }
  }
  if (isStrokeTool && "opacity" in nextPatch) {
    const normalized = normalizeRangeValue(nextPatch.opacity, {
      min: 10,
      max: 100,
      step: 10,
      fallback: session.styles[tool].opacity,
    });
    if (normalized === session.styles[tool].opacity && !Number.isFinite(Number(nextPatch.opacity))) {
      delete nextPatch.opacity;
    } else if (typeof nextPatch.opacity === "string" && nextPatch.opacity.trim() === "") {
      delete nextPatch.opacity;
    } else {
      nextPatch.opacity = normalized;
    }
  }

  return {
    ...session,
    styles: {
      ...session.styles,
      [tool]: { ...session.styles[tool], ...nextPatch },
    },
  };
}

const shortcuts = { v: "select", p: "pen", e: "eraser", l: "line", a: "arrow", t: "text" };

export function getToolFromShortcut(key, { isTyping = false } = {}) {
  if (isTyping) return null;
  return shortcuts[String(key).toLowerCase()] ?? null;
}
