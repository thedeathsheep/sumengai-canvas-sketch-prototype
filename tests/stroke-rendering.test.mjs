import assert from "node:assert/strict";
import test from "node:test";

let rendering = {};
try {
  rendering = await import("../src/strokeRendering.js");
} catch {
  // RED: the production module does not exist yet.
}

test("opacity percentages become safe canvas alpha values", () => {
  assert.equal(rendering.normalizeOpacity?.(100), 1);
  assert.equal(rendering.normalizeOpacity?.(40), 0.4);
  assert.equal(rendering.normalizeOpacity?.(0), 0.1);
  assert.equal(rendering.normalizeOpacity?.(140), 1);
});

test("smoothing levels move progressively less toward a noisy sample", () => {
  const previous = { x: 0, y: 0 };
  const current = { x: 10, y: 10 };
  assert.deepEqual(rendering.getSmoothedPoint?.(previous, current, "off"), { x: 10, y: 10 });
  assert.deepEqual(rendering.getSmoothedPoint?.(previous, current, "low"), { x: 6, y: 6 });
  assert.deepEqual(rendering.getSmoothedPoint?.(previous, current, "high"), { x: 3.5, y: 3.5 });
});

test("brush types create visibly different but bounded stroke characters", () => {
  assert.deepEqual(rendering.getBrushStrokeCharacter?.("pencil", 4), {
    lineWidth: 4,
    lineCap: "round",
    opacityFactor: 1,
  });
  assert.deepEqual(rendering.getBrushStrokeCharacter?.("brush", 4), {
    lineWidth: 5.4,
    lineCap: "round",
    opacityFactor: 0.92,
  });
  assert.deepEqual(rendering.getBrushStrokeCharacter?.("stylus", 4), {
    lineWidth: 3.4,
    lineCap: "round",
    opacityFactor: 1,
  });
  assert.deepEqual(rendering.getBrushStrokeCharacter?.("marker", 4), {
    lineWidth: 9.6,
    lineCap: "square",
    opacityFactor: 0.58,
  });
});

test("straight-line geometry preserves the drag endpoints", () => {
  assert.deepEqual(
    rendering.getStraightLine?.({ x: 18, y: 24 }, { x: 96, y: 72 }),
    { start: { x: 18, y: 24 }, end: { x: 96, y: 72 } },
  );
});

test("a drawing gesture freezes its pointer-down tool and style", () => {
  assert.equal(typeof rendering.createDrawingGesture, "function");
  const style = {
    color: "#303238",
    size: 3,
    opacity: 100,
    smoothing: "standard",
  };
  const gesture = rendering.createDrawingGesture({
    tool: "pen",
    style,
    start: { x: 12, y: 18 },
  });

  style.size = 24;
  style.color = "#ef4154";

  assert.equal(gesture.tool, "pen");
  assert.deepEqual(gesture.style, {
    color: "#303238",
    size: 3,
    opacity: 100,
    smoothing: "standard",
  });
  assert.deepEqual(gesture.start, { x: 12, y: 18 });
  assert.deepEqual(gesture.last, { x: 12, y: 18 });
  assert.deepEqual(gesture.lastRendered, { x: 12, y: 18 });
});

test("pointer-up flushes continuous tools while pointer-cancel never draws", () => {
  assert.equal(typeof rendering.getGestureCompletion, "function");
  assert.equal(rendering.getGestureCompletion("pen", "pointerup"), "final-segment");
  assert.equal(rendering.getGestureCompletion("eraser", "pointerup"), "final-segment");
  assert.equal(rendering.getGestureCompletion("line", "pointerup"), "preview");
  assert.equal(rendering.getGestureCompletion("pen", "pointercancel"), "cancel");
  assert.equal(rendering.getGestureCompletion("eraser", "pointercancel"), "cancel");
});

test("a final pen sample lands on the pointer-up endpoint without smoothing lag", () => {
  assert.equal(typeof rendering.getRenderedPenPoint, "function");
  const previous = { x: 0, y: 0 };
  const current = { x: 10, y: 10 };

  assert.deepEqual(
    rendering.getRenderedPenPoint(previous, current, "high"),
    { x: 3.5, y: 3.5 },
  );
  assert.deepEqual(
    rendering.getRenderedPenPoint(previous, current, "high", { isFinal: true }),
    { x: 10, y: 10 },
  );
});

test("the live canvas receives the updated stroke width and opacity", () => {
  assert.equal(typeof rendering.applyCanvasStrokeStyle, "function");
  const context = {};

  rendering.applyCanvasStrokeStyle(context, "pen", {
    color: "#2d75d4",
    size: 17,
    opacity: 40,
  });

  assert.deepEqual(
    {
      lineWidth: context.lineWidth,
      globalAlpha: context.globalAlpha,
      composite: context.globalCompositeOperation,
      strokeStyle: context.strokeStyle,
    },
    {
      lineWidth: 17,
      globalAlpha: 0.4,
      composite: "source-over",
      strokeStyle: "#2d75d4",
    },
  );
});

test("the live canvas uses the updated eraser width at full alpha", () => {
  assert.equal(typeof rendering.applyCanvasStrokeStyle, "function");
  const context = {};

  rendering.applyCanvasStrokeStyle(context, "eraser", { size: 72 });

  assert.equal(context.lineWidth, 72);
  assert.equal(context.globalAlpha, 1);
  assert.equal(context.globalCompositeOperation, "destination-out");
});

test("save composition preserves the styled drawing canvas at full opacity", () => {
  assert.equal(typeof rendering.compositeDrawingCanvas, "function");
  const drawingCanvas = { id: "styled-drawing-layer" };
  const calls = [];
  const context = {
    save() {},
    restore() {},
    drawImage(...args) {
      calls.push({
        args,
        globalAlpha: this.globalAlpha,
        composite: this.globalCompositeOperation,
      });
    },
  };

  rendering.compositeDrawingCanvas(context, drawingCanvas, {
    width: 1600,
    height: 900,
  });

  assert.deepEqual(calls, [
    {
      args: [drawingCanvas, 0, 0, 1600, 900],
      globalAlpha: 1,
      composite: "source-over",
    },
  ]);
});
