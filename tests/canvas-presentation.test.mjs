import assert from "node:assert/strict";
import test from "node:test";

let presentation = {};

try {
  presentation = await import("../src/canvasPresentation.js");
} catch {
  // The first red run proves the confirmed presentation contract is absent.
}

test("canvas chrome omits the persistent left toolbar", () => {
  assert.deepEqual(presentation.canvasChromePresentation, {
    showLeftToolbar: false,
    showZoomControls: true,
  });
});

test("primary editor tools use the minimum accepted pointer target", () => {
  assert.equal(presentation.editorToolHitSize, 40);
});

test("a selected ordinary image exposes the brush in its node quick actions", () => {
  assert.deepEqual(
    presentation.getNodeQuickActions?.({ selected: true, kind: "image" }),
    [{ id: "image-brush", label: "画笔" }],
  );
  assert.deepEqual(
    presentation.getNodeQuickActions?.({ selected: false, kind: "image" }),
    [],
  );
  assert.deepEqual(
    presentation.getNodeQuickActions?.({ selected: true, kind: "video" }),
    [],
  );
});

test("blank canvas context menu exposes the whiteboard entry", () => {
  assert.deepEqual(presentation.canvasContextMenuActions, [
    { id: "create-whiteboard", label: "创建白板" },
  ]);
});

test("top bar does not include a task queue action", () => {
  assert.deepEqual(presentation.topBarActions, [
    { id: "collaboration", label: "协作" },
  ]);
});

test("saved image nodes use the minimal presentation", () => {
  assert.deepEqual(presentation.savedImageNodePresentation, {
    titlePlacement: "outside",
    showFormatBadge: false,
    showFlattenedNote: false,
    showAnnotationAction: false,
  });
});

test("source image nodes do not expose footer actions", () => {
  assert.deepEqual(presentation.sourceImageNodePresentation, {
    showFooterActions: false,
  });
});

test("the whiteboard entry opens the shared drawing editor with a white background", () => {
  assert.deepEqual(presentation.createBlankSketchEditorSession(), {
    kind: "drawing",
    background: { type: "color", value: "#f4f3ef" },
  });
});

test("the image brush entry opens the same editor with the selected image as background", () => {
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

test("white and image backgrounds expose the same drawing tools", () => {
  assert.deepEqual(
    presentation.getEditorCapabilities?.(
      presentation.createBlankSketchEditorSession(),
    ),
    {
      allowImageInsert: true,
      allowElementLibrary: true,
      allowRatioChange: true,
    },
  );
  assert.deepEqual(
    presentation.getEditorCapabilities?.(
      presentation.createImageBrushEditorSession("/assets/owl-reference.jpg"),
    ),
    {
      allowImageInsert: true,
      allowElementLibrary: true,
      allowRatioChange: false,
    },
  );
});

test("saved results stack beside the source instead of leaving compact viewports", () => {
  assert.deepEqual(presentation.getSavedNodePosition?.(0), {
    left: 600,
    top: 132,
  });
  assert.deepEqual(presentation.getSavedNodePosition?.(1), {
    left: 600,
    top: 432,
  });
});
