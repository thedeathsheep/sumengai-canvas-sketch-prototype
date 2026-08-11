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
