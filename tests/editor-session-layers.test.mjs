import assert from "node:assert/strict";
import test from "node:test";

let layers = {};
try {
  layers = await import("../src/editorSessionLayers.js");
} catch {
  // RED: session-only object layers have not been implemented yet.
}

const sample = {
  hasImageBackground: true,
  hasDrawn: true,
  drawingVisible: true,
  mediaItems: [{ id: "image-1", label: "角色正面图", visible: true }],
  figures: [{ id: "house-1", label: "房子", visible: true }],
  textItems: [{ id: "text-1", value: "向左转身\n保持全身", visible: false }],
};

test("session layers describe editable objects without creating a project document", () => {
  const result = layers.getSessionLayers?.(sample);

  assert.deepEqual(
    result.map((layer) => layer.id),
    ["text-1", "house-1", "drawing", "image-1", "base"],
  );
  assert.deepEqual(result[0], {
    id: "text-1",
    kind: "text",
    label: "文字：向左转身",
    visible: false,
    locked: false,
  });
  assert.equal(result.at(-1).label, "锁定底图");
  assert.equal(result.at(-1).locked, true);
});

test("layer visibility changes remain scoped to the current editor state", () => {
  const next = layers.setSessionLayerVisibility?.(sample, "house-1", false);
  assert.equal(next.figures[0].visible, false);
  assert.equal(next.mediaItems[0].visible, true);
  assert.equal(next.drawingVisible, true);

  const hiddenDrawing = layers.setSessionLayerVisibility?.(sample, "drawing", false);
  assert.equal(hiddenDrawing.drawingVisible, false);
});

test("temporary object layers can move forward and backward inside their object stack", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(
    layers.moveSessionLayer?.(items, "b", "forward").map((item) => item.id),
    ["a", "c", "b"],
  );
  assert.deepEqual(
    layers.moveSessionLayer?.(items, "b", "backward").map((item) => item.id),
    ["b", "a", "c"],
  );
});
