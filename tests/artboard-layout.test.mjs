import assert from "node:assert/strict";
import test from "node:test";

let layout = {};

try {
  layout = await import("../src/artboardLayout.js");
} catch {
  // The first red run proves the ratio behavior is not implemented yet.
}

test("exposes the five PRD ratio presets", () => {
  assert.deepEqual(layout.artboardRatioOptions, [
    { id: "16:9", label: "16:9", value: 16 / 9 },
    { id: "9:16", label: "9:16", value: 9 / 16 },
    { id: "1:1", label: "1:1", value: 1 },
    { id: "4:3", label: "4:3", value: 4 / 3 },
    { id: "3:4", label: "3:4", value: 3 / 4 },
  ]);
});

test("unknown ratios fall back to 16:9", () => {
  assert.equal(layout.getAspectRatioValue?.("missing"), 16 / 9);
});

test("contains landscape content in a portrait artboard without cropping", () => {
  assert.deepEqual(
    layout.getContainTransform?.(
      { width: 800, height: 450 },
      { width: 360, height: 640 },
    ),
    { scale: 0.45, offsetX: 0, offsetY: 218.75 },
  );
});

test("fits portrait and landscape artboards inside the same available stage", () => {
  assert.deepEqual(
    layout.getFitArtboardSize?.({ width: 1000, height: 600 }, 16 / 9),
    { width: 1000, height: 562.5 },
  );
  assert.deepEqual(
    layout.getFitArtboardSize?.({ width: 1000, height: 600 }, 9 / 16),
    { width: 337.5, height: 600 },
  );
});

test("reserves editor chrome space at the browser acceptance viewports", () => {
  assert.deepEqual(
    layout.getAvailableArtboardSize?.({ width: 1440, height: 900 }),
    { width: 1266, height: 595 },
  );
  assert.deepEqual(
    layout.getAvailableArtboardSize?.({ width: 1024, height: 768 }),
    { width: 864, height: 463 },
  );
  assert.deepEqual(
    layout.getAvailableArtboardSize?.({ width: 767, height: 818 }),
    { width: 607, height: 513 },
  );
});

test("available artboard height keeps its minimum on a short viewport", () => {
  assert.deepEqual(
    layout.getAvailableArtboardSize?.({ width: 500, height: 400 }),
    { width: 340, height: 240 },
  );
});

test("remaps editor objects with one centered contain transform", () => {
  assert.deepEqual(
    layout.transformEditorObjects?.(
      {
        figures: [{ id: "figure", x: 50, y: 50, scale: 1 }],
        mediaItems: [{ id: "media", x: 100, y: 50, scale: 1 }],
        textItems: [{ id: "text", x: 200, y: 100, size: "medium" }],
      },
      { width: 800, height: 450 },
      { width: 360, height: 640 },
    ),
    {
      figures: [{ id: "figure", x: 50, y: 50, scale: 0.45 }],
      mediaItems: [
        { id: "media", x: 45, y: 241.25, scale: 0.45 },
      ],
      textItems: [
        { id: "text", x: 90, y: 263.75, size: "medium" },
      ],
    },
  );
});
