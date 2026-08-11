import assert from "node:assert/strict";
import test from "node:test";

let drawing = {};

try {
  drawing = await import("../src/annotationDrawing.js");
} catch {
  // The first red run proves these behaviors do not exist yet.
}

test("circle drag produces ellipse geometry", () => {
  assert.deepEqual(
    drawing.getAnnotationShape?.(
      "circle",
      { x: 10, y: 20 },
      { x: 110, y: 70 },
    ),
    {
      kind: "ellipse",
      centerX: 60,
      centerY: 45,
      radiusX: 50,
      radiusY: 25,
    },
  );
});

test("area drag normalizes a reverse rectangle", () => {
  assert.deepEqual(
    drawing.getAnnotationShape?.(
      "area",
      { x: 120, y: 80 },
      { x: 20, y: 30 },
    ),
    {
      kind: "rectangle",
      x: 20,
      y: 30,
      width: 100,
      height: 50,
    },
  );
});

test("tiny shape gestures are ignored", () => {
  assert.equal(
    drawing.isMeaningfulAnnotationShape?.(
      { x: 20, y: 20 },
      { x: 22, y: 23 },
    ),
    false,
  );
});

test("arrow drag produces a straight shaft and proportional arrowhead", () => {
  assert.deepEqual(
    drawing.getAnnotationArrow?.(
      { x: 20, y: 30 },
      { x: 120, y: 30 },
      4,
    ),
    {
      start: { x: 20, y: 30 },
      end: { x: 120, y: 30 },
      headLength: 18,
      headLeft: {
        x: 104.4115427318801,
        y: 39,
      },
      headRight: {
        x: 104.4115427318801,
        y: 21,
      },
    },
  );
});

test("arrowhead stays usable for short and long arrows", () => {
  assert.equal(
    drawing.getAnnotationArrow?.(
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      4,
    ).headLength,
    14,
  );
  assert.equal(
    drawing.getAnnotationArrow?.(
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      4,
    ).headLength,
    24,
  );
});

test("tiny arrow gestures are ignored", () => {
  assert.equal(
    drawing.isMeaningfulAnnotationArrow?.(
      { x: 20, y: 20 },
      { x: 27, y: 27 },
    ),
    false,
  );
  assert.equal(
    drawing.isMeaningfulAnnotationArrow?.(
      { x: 20, y: 20 },
      { x: 40, y: 20 },
    ),
    true,
  );
});

test("annotation text trims surrounding whitespace", () => {
  assert.equal(
    drawing.normalizeAnnotationText?.("  镜头推进  "),
    "镜头推进",
  );
  assert.equal(drawing.normalizeAnnotationText?.("   "), "");
});

test("annotation text uses three fixed sizes with medium as the default", () => {
  assert.deepEqual(drawing.annotationTextSizes, [
    { id: "small", label: "小", fontSize: 16 },
    { id: "medium", label: "中", fontSize: 24 },
    { id: "large", label: "大", fontSize: 36 },
  ]);
  assert.equal(drawing.getAnnotationTextSize?.(), 24);
  assert.equal(drawing.getAnnotationTextSize?.("large"), 36);
});

test("long annotation text wraps while preserving manual line breaks", () => {
  const measureText = (value) => value.length * 10;

  assert.deepEqual(
    drawing.wrapAnnotationText?.(
      "镜头缓慢向前推进\n人物保持不动",
      40,
      measureText,
    ),
    ["镜头缓慢", "向前推进", "人物保持", "不动"],
  );
});

test("editing placed text replaces that object without adding a duplicate", () => {
  const existing = [
    {
      id: "text-1",
      value: "镜头推进",
      size: "medium",
      color: "#ef4154",
      x: 40,
      y: 60,
    },
  ];

  assert.deepEqual(
    drawing.upsertAnnotationText?.(
      existing,
      {
        editingId: "text-1",
        value: "镜头缓慢推进\n人物保持不动",
        x: 40,
        y: 60,
      },
      { size: "large", color: "#2d75d4" },
      "unused-id",
    ),
    [
      {
        id: "text-1",
        value: "镜头缓慢推进\n人物保持不动",
        size: "large",
        color: "#2d75d4",
        x: 40,
        y: 60,
      },
    ],
  );
});
