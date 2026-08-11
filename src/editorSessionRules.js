export function canSaveEditor({
  hasContent,
  isSaving,
  hasPendingText,
}) {
  return Boolean(hasContent && !isSaving && !hasPendingText);
}

export function getPanelStateAfterInsert() {
  return {
    libraryOpen: false,
    imageBrowserOpen: false,
  };
}

export function canCanvasCapturePointer(tool) {
  return tool !== "select";
}

export function keepSelectionOnPlacedObjectClick(event) {
  event.stopPropagation();
}

const resizeHandleCorners = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export function getObjectResizeHandles({ selected, kind }) {
  return selected && ["media", "figure"].includes(kind)
    ? resizeHandleCorners
    : [];
}
