import assert from "node:assert/strict";
import test from "node:test";

let model = {};
try {
  model = await import("../src/editorToolModel.js");
} catch {
  // RED: the production module does not exist yet.
}

test("the primary rail exposes one unified drawing-tool order", () => {
  assert.deepEqual(
    model.primaryToolGroups?.flatMap((group) => group.tools.map((tool) => tool.id)),
    ["select", "pen", "eraser", "line", "arrow", "shape", "text", "image", "elements"],
  );
});

test("blank and image sessions use the approved default tools", () => {
  assert.equal(model.createInitialToolSession?.({ hasImageBackground: false }).activeTool, "pen");
  assert.equal(model.createInitialToolSession?.({ hasImageBackground: true }).activeTool, "select");
});

test("pencil defaults expose real lightweight brush properties", () => {
  const session = model.createInitialToolSession?.({ hasImageBackground: false });
  assert.deepEqual(session.styles.pen, {
    color: "#303238",
    size: 3,
    opacity: 100,
    smoothing: "low",
    brushType: "pencil",
  });
  assert.deepEqual(
    model.getRelevantControls?.({ activeTool: "pen", selectedKind: null }),
    ["color", "size", "opacity", "smoothing"],
  );
});

test("the pencil tool groups four familiar brush types without adding new primary tools", () => {
  assert.deepEqual(
    model.brushTypes?.map((brush) => [brush.id, brush.label]),
    [
      ["pencil", "铅笔"],
      ["brush", "毛笔"],
      ["stylus", "触控笔"],
      ["marker", "记号笔"],
    ],
  );

  const initial = model.createInitialToolSession({ hasImageBackground: false });
  const selected = model.selectBrushType?.(initial, "marker");
  assert.equal(selected.activeTool, "pen");
  assert.equal(selected.styles.pen.brushType, "marker");
  assert.equal(selected.styles.pen.size, 3);
  assert.equal(selected.styles.pen.opacity, 100);
});

test("the stabilizer uses the compact off low high model", () => {
  assert.deepEqual(
    model.stabilizerOptions?.map((option) => [option.id, option.label]),
    [
      ["off", "关"],
      ["low", "低"],
      ["high", "高"],
    ],
  );
});

test("style updates stay scoped to the selected tool", () => {
  const initial = model.createInitialToolSession?.({ hasImageBackground: false });
  const updated = model.updateToolStyle?.(initial, "pen", { color: "#2d75d4", size: 8 });
  assert.equal(updated.styles.pen.color, "#2d75d4");
  assert.equal(updated.styles.pen.size, 8);
  assert.equal(updated.styles.arrow.color, "#ef4154");
});

test("style updates clamp ranges used by the UI", () => {
  const initial = model.createInitialToolSession({ hasImageBackground: false });
  const updated = model.updateToolStyle(initial, "pen", { size: 99, opacity: 0 });
  assert.equal(updated.styles.pen.size, 24);
  assert.equal(updated.styles.pen.opacity, 10);
});

test("valid stroke values pass through at the lower, middle, and upper bounds", () => {
  const initial = model.createInitialToolSession({ hasImageBackground: false });
  const minimum = model.updateToolStyle(initial, "pen", { size: 1, opacity: 10 });
  const middle = model.updateToolStyle(initial, "line", { size: 12, opacity: 60 });
  const maximum = model.updateToolStyle(initial, "arrow", { size: 24, opacity: 100 });

  assert.deepEqual(
    [minimum.styles.pen.size, minimum.styles.pen.opacity],
    [1, 10],
  );
  assert.deepEqual(
    [middle.styles.line.size, middle.styles.line.opacity],
    [12, 60],
  );
  assert.deepEqual(
    [maximum.styles.arrow.size, maximum.styles.arrow.opacity],
    [24, 100],
  );
});

test("stroke values honor the declared whole-pixel and ten-percent steps", () => {
  const initial = model.createInitialToolSession({ hasImageBackground: false });
  const updated = model.updateToolStyle(initial, "pen", {
    size: 7.6,
    opacity: 54,
  });

  assert.equal(updated.styles.pen.size, 8);
  assert.equal(updated.styles.pen.opacity, 50);
});

test("empty and non-numeric style updates never enter the session", () => {
  const initial = model.createInitialToolSession({ hasImageBackground: false });
  const empty = model.updateToolStyle(initial, "pen", { size: "", opacity: "" });
  const invalid = model.updateToolStyle(initial, "pen", {
    size: Number.NaN,
    opacity: "not-a-number",
  });

  assert.deepEqual(empty.styles.pen, initial.styles.pen);
  assert.deepEqual(invalid.styles.pen, initial.styles.pen);
});

test("eraser style updates use the eraser-specific size bounds", () => {
  const initial = model.createInitialToolSession({ hasImageBackground: false });
  const tooSmall = model.updateToolStyle(initial, "eraser", { size: 2 });
  const tooLarge = model.updateToolStyle(initial, "eraser", { size: 120 });
  assert.equal(tooSmall.styles.eraser.size, 8);
  assert.equal(tooLarge.styles.eraser.size, 80);
});

test("eraser values accept both bounds and normalize to whole pixels", () => {
  const initial = model.createInitialToolSession({ hasImageBackground: false });
  const minimum = model.updateToolStyle(initial, "eraser", { size: 8 });
  const middle = model.updateToolStyle(initial, "eraser", { size: 43.6 });
  const maximum = model.updateToolStyle(initial, "eraser", { size: 80 });

  assert.equal(minimum.styles.eraser.size, 8);
  assert.equal(middle.styles.eraser.size, 44);
  assert.equal(maximum.styles.eraser.size, 80);
});

test("text style updates preserve fixed size identifiers", () => {
  const initial = model.createInitialToolSession({ hasImageBackground: false });
  const updated = model.updateToolStyle(initial, "text", { size: "large" });
  assert.equal(updated.styles.text.size, "large");
});

test("shortcuts map familiar keys to tools without guessing", () => {
  assert.deepEqual(
    ["v", "p", "e", "l", "a", "t"].map(model.getToolFromShortcut),
    ["select", "pen", "eraser", "line", "arrow", "text"],
  );
  assert.equal(model.getToolFromShortcut?.("x"), null);
});

test("shortcut resolution ignores typing targets", () => {
  assert.equal(model.getToolFromShortcut("p", { isTyping: true }), null);
  assert.equal(model.getToolFromShortcut("p", { isTyping: false }), "pen");
});
