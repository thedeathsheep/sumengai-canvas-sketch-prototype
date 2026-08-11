import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  createInitialToolSession,
  updateToolStyle,
} from "../src/editorToolModel.js";

let interactions = {};
try {
  interactions = await import("../src/editorChromeInteractions.js");
} catch {
  // RED: the reusable interaction helpers do not exist yet.
}

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { EditorContextBar, EditorToolRail, EditorUtilityDock } = await vite.ssrLoadModule(
  "/src/EditorChrome.jsx",
);

after(async () => {
  await vite.close();
});

test("range sliders and editable number inputs expose the same constraints", () => {
  const pen = renderToStaticMarkup(
    React.createElement(EditorContextBar, {
      activeTool: "pen",
      selectedKind: null,
      style: { color: "#303238", size: 3, opacity: 100, smoothing: "standard" },
      onStyleChange() {},
    }),
  );
  const eraser = renderToStaticMarkup(
    React.createElement(EditorContextBar, {
      activeTool: "eraser",
      selectedKind: null,
      style: { size: 24 },
      onStyleChange() {},
    }),
  );

  assert.match(pen, /type="range" min="1" max="24" step="1"/);
  assert.match(pen, /type="number" min="1" max="24" step="1"[^>]*aria-label="线宽数值"/);
  assert.match(pen, /type="range" min="10" max="100" step="10"/);
  assert.match(pen, /type="number" min="10" max="100" step="10"[^>]*aria-label="不透明度数值"/);
  assert.match(eraser, /type="number" min="8" max="80" step="1"[^>]*aria-label="橡皮大小数值"/);
});

test("slider updates publish immediately and synchronize the numeric draft", () => {
  assert.equal(typeof interactions.getRangeSliderUpdate, "function");
  assert.deepEqual(
    interactions.getRangeSliderUpdate?.("18", {
      currentValue: 3,
      min: 1,
      max: 24,
      step: 1,
    }),
    { draft: "18", value: 18, shouldCommit: true },
  );
});

test("range updates travel through the shared callback into the tool session", () => {
  assert.equal(typeof interactions.applyRangeControlUpdate, "function");
  let session = createInitialToolSession({ hasImageBackground: false });
  let draft = "3";
  const publish = (property, update) =>
    interactions.applyRangeControlUpdate?.(update, {
      setDraft: (value) => {
        draft = value;
      },
      onChange: (value) => {
        session = updateToolStyle(session, "pen", { [property]: value });
      },
    });

  publish(
    "size",
    interactions.getRangeSliderUpdate("18", {
      currentValue: 3,
      min: 1,
      max: 24,
      step: 1,
    }),
  );
  assert.equal(draft, "18");
  assert.equal(session.styles.pen.size, 18);

  const opacityDraft = interactions.getRangeDraftUpdate("40");
  assert.equal(opacityDraft.shouldCommit, false);
  assert.equal(session.styles.pen.opacity, 100);
  publish(
    "opacity",
    interactions.commitRangeDraft(opacityDraft.draft, {
      currentValue: 100,
      min: 10,
      max: 100,
      step: 10,
    }),
  );
  assert.equal(draft, "40");
  assert.equal(session.styles.pen.opacity, 40);
});

test("number drafts wait for blur or Enter and then clamp and snap", () => {
  assert.equal(typeof interactions.getRangeDraftUpdate, "function");
  assert.equal(typeof interactions.commitRangeDraft, "function");
  assert.deepEqual(interactions.getRangeDraftUpdate?.(""), {
    draft: "",
    value: null,
    shouldCommit: false,
  });
  assert.deepEqual(
    interactions.commitRangeDraft?.("55", {
      currentValue: 100,
      min: 10,
      max: 100,
      step: 10,
    }),
    { draft: "60", value: 60, shouldCommit: true },
  );
  assert.deepEqual(
    interactions.commitRangeDraft?.("999", {
      currentValue: 24,
      min: 1,
      max: 24,
      step: 1,
    }),
    { draft: "24", value: 24, shouldCommit: false },
  );
});

test("empty and non-numeric drafts revert without publishing invalid state", () => {
  assert.deepEqual(
    interactions.commitRangeDraft?.("", {
      currentValue: 8,
      min: 1,
      max: 24,
      step: 1,
    }),
    { draft: "8", value: 8, shouldCommit: false },
  );
  assert.deepEqual(
    interactions.commitRangeDraft?.("NaN", {
      currentValue: 24,
      min: 8,
      max: 80,
      step: 1,
    }),
    { draft: "24", value: 24, shouldCommit: false },
  );
});

test("shape activation and disclosure are independent accessible buttons", () => {
  const html = renderToStaticMarkup(
    React.createElement(EditorToolRail, {
      activeTool: "pen",
      lastShapeTool: "circle",
      onSelectTool() {},
      onSelectShape() {},
      onToggleImage() {},
      onToggleElements() {},
    }),
  );

  assert.match(html, /aria-label="使用最近形状：圆形"[^>]*title="使用最近形状：圆形"/);
  assert.match(html, /aria-label="展开形状选择"[^>]*aria-expanded="false"[^>]*title="展开形状选择"/);
});

test("brush activation and disclosure expose the current familiar brush type", () => {
  const html = renderToStaticMarkup(
    React.createElement(EditorToolRail, {
      activeTool: "pen",
      activeBrushType: "pencil",
      lastShapeTool: "circle",
      onSelectTool() {},
      onSelectBrushType() {},
      onSelectShape() {},
      onToggleImage() {},
      onToggleElements() {},
    }),
  );

  assert.match(html, /aria-label="使用当前画笔：铅笔 \(P\)"/);
  assert.match(html, /aria-label="展开画笔选择"[^>]*aria-expanded="false"/);
});

test("popover selection and Escape both close and restore trigger focus", () => {
  assert.equal(typeof interactions.selectPopoverOption, "function");
  assert.equal(typeof interactions.handlePopoverEscape, "function");
  const events = [];
  const trigger = { focus: () => events.push("focus") };

  interactions.selectPopoverOption?.({
    select: () => events.push("select"),
    close: () => events.push("close"),
    trigger,
  });
  assert.deepEqual(events, ["select", "close", "focus"]);

  events.length = 0;
  const keyboardEvent = {
    key: "Escape",
    preventDefault: () => events.push("prevent"),
    stopPropagation: () => events.push("stop"),
  };
  assert.equal(
    interactions.handlePopoverEscape?.(keyboardEvent, {
      close: () => events.push("close"),
      trigger,
    }),
    true,
  );
  assert.deepEqual(events, ["prevent", "stop", "close", "focus"]);
});

test("leaving circle or area closes the shape chooser", () => {
  assert.equal(typeof interactions.shouldCloseShapeChooser, "function");
  assert.equal(interactions.shouldCloseShapeChooser?.("circle"), false);
  assert.equal(interactions.shouldCloseShapeChooser?.("area"), false);
  assert.equal(interactions.shouldCloseShapeChooser?.("pen"), true);
  assert.equal(interactions.shouldCloseShapeChooser?.("select"), true);
});

test("the cinematic stage exposes session-only layers without project controls", () => {
  const html = renderToStaticMarkup(
    React.createElement(EditorUtilityDock, {
      layerCount: 4,
      layersOpen: true,
      shortcutsOpen: false,
      layers: [
        { id: "drawing", kind: "drawing", label: "手绘笔迹", visible: true, locked: false },
        { id: "base", kind: "base", label: "锁定底图", visible: true, locked: true },
      ],
      onToggleLayers() {},
      onToggleShortcuts() {},
      onSelectLayer() {},
      onToggleLayerVisibility() {},
    }),
  );

  assert.match(html, /图层 4/);
  assert.match(html, /仅本次编辑有效/);
  assert.doesNotMatch(html, /快捷键/);
  assert.doesNotMatch(html, /保存工程|我的工程/);
});
