export const canvasChromePresentation = {
  showLeftToolbar: false,
  showZoomControls: true,
};

export const editorToolHitSize = 40;

export const selectedImageBrushAction = {
  id: "image-brush",
  label: "画笔",
};

export function getNodeQuickActions({ selected, kind }) {
  if (!selected || kind !== "image") return [];
  return [selectedImageBrushAction];
}

export const canvasContextMenuActions = [
  { id: "create-whiteboard", label: "创建白板" },
];

export const topBarActions = [{ id: "collaboration", label: "协作" }];

export const savedImageNodePresentation = {
  titlePlacement: "outside",
  showFormatBadge: false,
  showFlattenedNote: false,
  showAnnotationAction: false,
};

export const sourceImageNodePresentation = {
  showFooterActions: false,
};

export function createBlankSketchEditorSession() {
  return {
    kind: "drawing",
    background: { type: "color", value: "#f4f3ef" },
  };
}

export function createImageBrushEditorSession(selectedImage) {
  if (!selectedImage) return null;
  return {
    kind: "drawing",
    background: {
      type: "image",
      src: selectedImage,
    },
  };
}

export function getEditorCapabilities(session) {
  return {
    allowImageInsert: true,
    allowElementLibrary: true,
    allowRatioChange: session?.background?.type === "color",
  };
}

export function createOrdinaryImageNode({
  id,
  dataUrl,
  annotation,
  assetId,
}) {
  return {
    id,
    dataUrl,
    annotation,
    assetId,
  };
}

export function getSavedNodePosition(index) {
  return {
    left: 600,
    top: 132 + index * 300,
  };
}
