const isVisible = (item) => item.visible !== false;

const textLabel = (item) => {
  const firstLine = String(item.value ?? "").split("\n")[0].trim();
  const summary = firstLine.length > 8 ? `${firstLine.slice(0, 8)}…` : firstLine;
  return `文字：${summary || "未命名"}`;
};

const objectLayer = (item, kind, label) => ({
  id: item.id,
  kind,
  label,
  visible: isVisible(item),
  locked: false,
});

export function getSessionLayers({
  hasImageBackground,
  hasDrawn,
  drawingVisible = true,
  mediaItems = [],
  figures = [],
  textItems = [],
}) {
  const layers = [
    ...[...textItems]
      .reverse()
      .map((item) => objectLayer(item, "text", textLabel(item))),
    ...[...figures]
      .reverse()
      .map((item) => objectLayer(item, "figure", item.label || "元素")),
  ];

  if (hasDrawn) {
    layers.push({
      id: "drawing",
      kind: "drawing",
      label: "手绘笔迹",
      visible: drawingVisible,
      locked: false,
    });
  }

  layers.push(
    ...[...mediaItems]
      .reverse()
      .map((item) => objectLayer(item, "media", item.label || "图片")),
  );

  layers.push({
    id: "base",
    kind: "base",
    label: hasImageBackground ? "锁定底图" : "白色画板",
    visible: true,
    locked: true,
  });

  return layers;
}

export function setSessionLayerVisibility(state, layerId, visible) {
  if (layerId === "base") return state;
  if (layerId === "drawing") return { ...state, drawingVisible: visible };

  const update = (items) =>
    items.map((item) => (item.id === layerId ? { ...item, visible } : item));

  return {
    ...state,
    mediaItems: update(state.mediaItems ?? []),
    figures: update(state.figures ?? []),
    textItems: update(state.textItems ?? []),
  };
}

export function moveSessionLayer(items, id, direction) {
  const index = items.findIndex((item) => item.id === id);
  const target = direction === "forward" ? index + 1 : index - 1;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const reordered = [...items];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return reordered;
}
