export function getAnnotationShape(tool, start, end) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  if (tool === "circle") {
    return {
      kind: "ellipse",
      centerX: left + width / 2,
      centerY: top + height / 2,
      radiusX: width / 2,
      radiusY: height / 2,
    };
  }

  if (tool === "area") {
    return {
      kind: "rectangle",
      x: left,
      y: top,
      width,
      height,
    };
  }

  return null;
}

export function isMeaningfulAnnotationShape(start, end) {
  return Math.abs(end.x - start.x) >= 4 && Math.abs(end.y - start.y) >= 4;
}

export function getAnnotationArrow(start, end, lineWidth = 4) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const distance = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX);
  const headLength = Math.min(
    lineWidth * 6,
    Math.max(lineWidth * 3.5, distance * 0.18),
  );
  const headAngle = Math.PI / 6;

  return {
    start,
    end,
    headLength,
    headLeft: {
      x: end.x - headLength * Math.cos(angle - headAngle),
      y: end.y - headLength * Math.sin(angle - headAngle),
    },
    headRight: {
      x: end.x - headLength * Math.cos(angle + headAngle),
      y: end.y - headLength * Math.sin(angle + headAngle),
    },
  };
}

export function isMeaningfulAnnotationArrow(start, end) {
  return Math.hypot(end.x - start.x, end.y - start.y) >= 12;
}

export function normalizeAnnotationText(value) {
  return value.trim();
}

export const annotationTextSizes = [
  { id: "small", label: "小", fontSize: 16 },
  { id: "medium", label: "中", fontSize: 24 },
  { id: "large", label: "大", fontSize: 36 },
];

export function getAnnotationTextSize(size = "medium") {
  return (
    annotationTextSizes.find((option) => option.id === size) ??
    annotationTextSizes[1]
  ).fontSize;
}

export function wrapAnnotationText(value, maxWidth, measureText) {
  return value.split("\n").flatMap((paragraph) => {
    if (!paragraph) return [""];

    const lines = [];
    let line = "";

    for (const character of paragraph) {
      const candidate = `${line}${character}`;
      if (line && measureText(candidate) > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }

    lines.push(line);
    return lines;
  });
}

export function upsertAnnotationText(items, draft, style, id) {
  const textItem = {
    id: draft.editingId ?? id,
    value: normalizeAnnotationText(draft.value),
    size: style.size,
    color: style.color,
    x: draft.x,
    y: draft.y,
  };

  if (!draft.editingId) return [...items, textItem];
  return items.map((item) =>
    item.id === draft.editingId ? textItem : item,
  );
}
