import assert from "node:assert/strict";
import test from "node:test";

import * as presentation from "../src/canvasPresentation.js";
import {
  artboardRatioOptions,
  getAspectRatioValue,
} from "../src/artboardLayout.js";
import {
  createInitialToolSession,
  getToolButtonState,
  getRelevantControls,
  primaryToolGroups,
} from "../src/editorToolModel.js";

let editorRules = {};

try {
  editorRules = await import("../src/editorSessionRules.js");
} catch {
  // The first red run proves editor completion rules are absent.
}

test("whiteboard and image brush are two backgrounds of the same drawing editor", () => {
  assert.deepEqual(presentation.createBlankSketchEditorSession(), {
    kind: "drawing",
    background: { type: "color", value: "#f4f3ef" },
  });
  assert.deepEqual(
    presentation.createImageBrushEditorSession("/assets/owl-reference.jpg"),
    {
      kind: "drawing",
      background: {
        type: "image",
        src: "/assets/owl-reference.jpg",
      },
    },
  );
  assert.equal(presentation.createImageBrushEditorSession(), null);
});

test("both editor backgrounds support imported images and library elements", () => {
  const blank = presentation.getEditorCapabilities?.(
    presentation.createBlankSketchEditorSession(),
  );
  const image = presentation.getEditorCapabilities?.(
    presentation.createImageBrushEditorSession("/assets/owl-reference.jpg"),
  );

  assert.equal(blank?.allowImageInsert, true);
  assert.equal(image?.allowImageInsert, true);
  assert.equal(blank?.allowElementLibrary, true);
  assert.equal(image?.allowElementLibrary, true);
});

test("the image brush lives on the selected image node, not canvas chrome", () => {
  assert.equal(presentation.canvasChromePresentation?.showLeftToolbar, false);
  assert.deepEqual(
    presentation.getNodeQuickActions?.({ selected: true, kind: "image" }),
    [{ id: "image-brush", label: "画笔" }],
  );
  assert.deepEqual(
    presentation.getNodeQuickActions?.({ selected: false, kind: "image" }),
    [],
  );
});

test("the blank editor exposes exactly the five approved aspect ratios", () => {
  assert.deepEqual(
    artboardRatioOptions.map((option) => option.id),
    ["16:9", "9:16", "1:1", "4:3", "3:4"],
  );
  assert.equal(getAspectRatioValue("16:9"), 16 / 9);
});

test("the editor uses one rail rather than drawing and annotation modes", () => {
  assert.deepEqual(primaryToolGroups.map((group) => group.id), ["tools", "content"]);
  assert.deepEqual(
    primaryToolGroups[0].tools.map((tool) => tool.label),
    ["选择", "画笔", "橡皮", "直线", "箭头", "形状", "文字"],
  );
});

test("context controls show only properties relevant to the current tool", () => {
  assert.deepEqual(
    getRelevantControls({ activeTool: "pen", selectedKind: null }),
    ["color", "size", "opacity", "smoothing"],
  );
  assert.deepEqual(
    getRelevantControls({ activeTool: "eraser", selectedKind: null }),
    ["eraser-size"],
  );
  assert.deepEqual(
    getRelevantControls({ activeTool: "select", selectedKind: "media" }),
    ["object-actions"],
  );
});

test("entry background decides the initial tool without changing the editor", () => {
  assert.equal(createInitialToolSession({ hasImageBackground: false }).activeTool, "pen");
  assert.equal(createInitialToolSession({ hasImageBackground: true }).activeTool, "select");
});

test("grouped and content tools expose their real active state", () => {
  assert.equal(getToolButtonState({ toolId: "shape", activeTool: "area" }), true);
  assert.equal(getToolButtonState({ toolId: "image", imageBrowserOpen: true }), true);
  assert.equal(getToolButtonState({ toolId: "elements", libraryOpen: true }), true);
  assert.equal(getToolButtonState({ toolId: "pen", activeTool: "select" }), false);
});

test("save is enabled only for completed new content", () => {
  assert.equal(
    editorRules.canSaveEditor?.({
      hasContent: false,
      isSaving: false,
      hasPendingText: false,
    }),
    false,
  );
  assert.equal(
    editorRules.canSaveEditor?.({
      hasContent: true,
      isSaving: false,
      hasPendingText: true,
    }),
    false,
  );
  assert.equal(
    editorRules.canSaveEditor?.({
      hasContent: true,
      isSaving: false,
      hasPendingText: false,
    }),
    true,
  );
});

test("successful insertion closes both content pickers before object editing", () => {
  assert.deepEqual(editorRules.getPanelStateAfterInsert?.(), {
    libraryOpen: false,
    imageBrowserOpen: false,
  });
});

test("selection mode lets pointer input reach imported images and objects", () => {
  assert.equal(editorRules.canCanvasCapturePointer?.("select"), false);
  assert.equal(editorRules.canCanvasCapturePointer?.("pen"), true);
  assert.equal(editorRules.canCanvasCapturePointer?.("arrow"), true);
});

test("placed objects keep selection by stopping their click before it reaches the artboard", () => {
  let propagationStopped = false;

  editorRules.keepSelectionOnPlacedObjectClick?.({
    stopPropagation() {
      propagationStopped = true;
    },
  });

  assert.equal(propagationStopped, true);
});

test("saved results are ordinary image nodes without generation side effects", () => {
  assert.deepEqual(
    presentation.createOrdinaryImageNode?.({
      id: "01",
      dataUrl: "data:image/png;base64,result",
      annotation: true,
      assetId: "asset-1",
    }),
    {
      id: "01",
      dataUrl: "data:image/png;base64,result",
      annotation: true,
      assetId: "asset-1",
    },
  );
  assert.deepEqual(presentation.savedImageNodePresentation, {
    titlePlacement: "outside",
    showFormatBadge: false,
    showFlattenedNote: false,
    showAnnotationAction: false,
  });
});
