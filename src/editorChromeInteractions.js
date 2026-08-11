import { normalizeRangeValue } from "./numericRange.js";

export function getRangeDraftUpdate(value) {
  return {
    draft: String(value),
    value: null,
    shouldCommit: false,
  };
}

export function getRangeSliderUpdate(
  value,
  { currentValue, min, max, step },
) {
  const normalized = normalizeRangeValue(value, {
    min,
    max,
    step,
    fallback: currentValue,
  });
  return {
    draft: String(normalized),
    value: normalized,
    shouldCommit: normalized !== currentValue,
  };
}

export function commitRangeDraft(
  draft,
  { currentValue, min, max, step },
) {
  const normalized = normalizeRangeValue(draft, {
    min,
    max,
    step,
    fallback: currentValue,
  });
  return {
    draft: String(normalized),
    value: normalized,
    shouldCommit: normalized !== currentValue,
  };
}

export function applyRangeControlUpdate(update, { setDraft, onChange }) {
  setDraft(update.draft);
  if (update.shouldCommit) onChange(update.value);
  return update;
}

function closeAndRestoreFocus({ close, trigger }) {
  close();
  trigger?.focus?.();
}

export function selectPopoverOption({ select, close, trigger }) {
  select();
  closeAndRestoreFocus({ close, trigger });
}

export function handlePopoverEscape(event, { close, trigger }) {
  if (event.key !== "Escape") return false;
  event.preventDefault();
  event.stopPropagation();
  closeAndRestoreFocus({ close, trigger });
  return true;
}

export function shouldCloseShapeChooser(activeTool) {
  return !["circle", "area"].includes(activeTool);
}
