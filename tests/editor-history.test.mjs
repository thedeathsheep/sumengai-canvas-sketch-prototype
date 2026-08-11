import assert from "node:assert/strict";
import test from "node:test";

let historyModule = {};

try {
  historyModule = await import("../src/editorHistory.js");
} catch {
  // The first red run proves editor history is not implemented yet.
}

test("new history starts with no undo or redo states", () => {
  assert.deepEqual(historyModule.createEditorHistory?.(), {
    past: [],
    future: [],
  });
});

test("committing a new edit stores the old state and clears redo", () => {
  const initial = { ratio: "16:9", figures: [] };
  assert.deepEqual(
    historyModule.commitEditorSnapshot?.(
      { past: [], future: [{ ratio: "9:16", figures: [] }] },
      initial,
    ),
    {
      past: [initial],
      future: [],
    },
  );
});

test("undo restores the last snapshot and makes the current state redoable", () => {
  const initial = { ratio: "16:9" };
  const changed = { ratio: "1:1" };
  assert.deepEqual(
    historyModule.undoEditorHistory?.(
      { past: [initial], future: [] },
      changed,
    ),
    {
      snapshot: initial,
      history: {
        past: [],
        future: [changed],
      },
    },
  );
});

test("redo restores the state removed by undo", () => {
  const initial = { ratio: "16:9" };
  const changed = { ratio: "1:1" };
  const undone = historyModule.undoEditorHistory?.(
    { past: [initial], future: [] },
    changed,
  );

  assert.deepEqual(
    historyModule.redoEditorHistory?.(undone.history, initial),
    {
      snapshot: changed,
      history: {
        past: [initial],
        future: [],
      },
    },
  );
});

test("undo and redo return a null snapshot when unavailable", () => {
  const empty = { past: [], future: [] };
  assert.deepEqual(historyModule.undoEditorHistory?.(empty, { value: 1 }), {
    history: empty,
    snapshot: null,
  });
  assert.deepEqual(historyModule.redoEditorHistory?.(empty, { value: 1 }), {
    history: empty,
    snapshot: null,
  });
});
