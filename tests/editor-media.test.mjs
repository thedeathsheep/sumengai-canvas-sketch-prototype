import assert from "node:assert/strict";
import test from "node:test";

let media = {};

try {
  media = await import("../src/editorMedia.js");
} catch {
  // The first red run proves the editor media behavior is absent.
}

test("a landscape image is centered and fitted inside the artboard", () => {
  assert.deepEqual(
    media.getInitialMediaPlacement?.(
      { naturalWidth: 1200, naturalHeight: 800 },
      { width: 1000, height: 600 },
    ),
    {
      x: 290,
      y: 160,
      width: 420,
      height: 280,
      rotation: 0,
      flipped: false,
    },
  );
});

test("a portrait image is centered without exceeding the artboard height", () => {
  assert.deepEqual(
    media.getInitialMediaPlacement?.(
      { naturalWidth: 400, naturalHeight: 800 },
      { width: 1000, height: 600 },
    ),
    {
      x: 410,
      y: 120,
      width: 180,
      height: 360,
      rotation: 0,
      flipped: false,
    },
  );
});

test("image objects can move one layer forward or backward", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  assert.deepEqual(
    media.moveMediaLayer?.(items, "b", "forward").map((item) => item.id),
    ["a", "c", "b"],
  );
  assert.deepEqual(
    media.moveMediaLayer?.(items, "b", "backward").map((item) => item.id),
    ["b", "a", "c"],
  );
});

test("corner dragging resizes an object proportionally and clamps usable scale", () => {
  const baseGesture = {
    center: { clientX: 100, clientY: 100 },
    startPointer: { clientX: 150, clientY: 100 },
    initialScale: 1,
    viewScale: 2,
  };

  assert.equal(
    media.getUniformObjectScale?.({
      ...baseGesture,
      pointer: { clientX: 200, clientY: 100 },
    }),
    2,
  );
  assert.equal(
    media.getUniformObjectScale?.({
      ...baseGesture,
      pointer: { clientX: 125, clientY: 100 },
    }),
    0.5,
  );
  assert.equal(
    media.getUniformObjectScale?.({
      ...baseGesture,
      pointer: { clientX: 105, clientY: 100 },
    }),
    0.35,
  );
  assert.equal(
    media.getUniformObjectScale?.({
      ...baseGesture,
      pointer: { clientX: 400, clientY: 100 },
    }),
    3,
  );
});

test("toolbar scale nudges use the same limits as corner resizing", () => {
  assert.equal(media.nudgeObjectScale?.(1, "up"), 1.15);
  assert.equal(media.nudgeObjectScale?.(1, "down"), 0.85);
  assert.equal(media.nudgeObjectScale?.(3, "up"), 3);
  assert.equal(media.nudgeObjectScale?.(0.35, "down"), 0.35);
});

test("a dragged library element is placed at the pointer position on a scaled artboard", () => {
  assert.deepEqual(
    media.getElementDropPosition?.(
      { clientX: 620, clientY: 400 },
      { left: 100, top: 100, width: 800, height: 450 },
    ),
    { x: 65, y: 66.67 },
  );
});

test("a dragged library element stays inside the artboard safe area", () => {
  assert.deepEqual(
    media.getElementDropPosition?.(
      { clientX: 40, clientY: 700 },
      { left: 100, top: 100, width: 800, height: 450 },
    ),
    { x: 4, y: 92 },
  );
});

test("an element drop is accepted only while the pointer is inside the artboard", () => {
  const artboard = { left: 100, top: 100, width: 800, height: 450 };

  assert.deepEqual(
    media.getElementDropPlacement?.(
      { clientX: 620, clientY: 400 },
      artboard,
    ),
    { x: 65, y: 66.67 },
  );
  assert.equal(
    media.getElementDropPlacement?.(
      { clientX: 40, clientY: 700 },
      artboard,
    ),
    null,
  );
});

test("native asset dragging is cancelled so the editor owns the pointer gesture", () => {
  const event = new Event("dragstart", { cancelable: true });

  media.preventNativeAssetDrag?.(event);

  assert.equal(event.defaultPrevented, true);
});

test("an image-card gesture becomes a drag only after crossing the pointer threshold", () => {
  const pending = {
    pointerId: 7,
    startX: 100,
    startY: 100,
  };

  assert.equal(
    media.shouldStartAssetPointerDrag?.(pending, {
      pointerId: 7,
      clientX: 103,
      clientY: 104,
    }),
    false,
  );
  assert.equal(
    media.shouldStartAssetPointerDrag?.(pending, {
      pointerId: 7,
      clientX: 108,
      clientY: 100,
    }),
    true,
  );
  assert.equal(
    media.shouldStartAssetPointerDrag?.(pending, {
      pointerId: 8,
      clientX: 120,
      clientY: 120,
    }),
    false,
  );
});

test("drag click suppression expires when pointer-up happens outside the image card", () => {
  const guard = { current: false };
  let release;

  media.armTransientAssetClickSuppression?.(guard, (callback) => {
    release = callback;
  });

  assert.equal(guard.current, true);
  release?.();
  assert.equal(guard.current, false);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createCoordinatorHarness() {
  const loads = new Map();
  const history = [];
  let state = {
    aspectRatio: "16:9",
    figures: [],
    mediaItems: [],
    textItems: [],
    hasDrawn: false,
    canvasDataUrl: "canvas:initial",
    selectedId: null,
    activeTool: "pen",
  };
  const coordinator = media.createMediaInsertCoordinator?.({
    loadImage: (asset) => loads.get(asset.id).promise,
    getLatestState: () => structuredClone(state),
    getArtboard: () => ({ width: 1000, height: 600 }),
    createId: (asset) => `inserted-${asset.id}`,
    commit: (transition) => {
      history.push(transition.previousState);
      state = transition.nextState;
    },
  });

  return {
    coordinator,
    history,
    loads,
    getState: () => state,
    editState: (patch) => {
      state = { ...state, ...patch };
    },
  };
}

test("concurrent image loads commit in completion order but select the latest request", async () => {
  assert.equal(typeof media.createMediaInsertCoordinator, "function");
  const harness = createCoordinatorHarness();
  harness.loads.set("first", deferred());
  harness.loads.set("second", deferred());

  const firstInsert = harness.coordinator.insert({
    id: "first",
    label: "第一张",
    src: "/first.png",
  });
  const secondInsert = harness.coordinator.insert({
    id: "second",
    label: "第二张",
    src: "/second.png",
  });

  harness.loads.get("second").resolve({ naturalWidth: 1200, naturalHeight: 800 });
  await secondInsert;
  harness.loads.get("first").resolve({ naturalWidth: 1200, naturalHeight: 800 });
  await firstInsert;

  assert.deepEqual(
    harness.getState().mediaItems.map((item) => item.id),
    ["inserted-second", "inserted-first"],
  );
  assert.equal(harness.getState().selectedId, "inserted-second");
  assert.equal(harness.getState().activeTool, "select");
  assert.deepEqual(
    harness.history.map((snapshot) => snapshot.mediaItems.map((item) => item.id)),
    [[], ["inserted-second"]],
  );
});

test("an insert undo snapshot captures edits made while its image was loading", async () => {
  assert.equal(typeof media.createMediaInsertCoordinator, "function");
  const harness = createCoordinatorHarness();
  harness.loads.set("slow", deferred());

  const insert = harness.coordinator.insert({
    id: "slow",
    label: "慢速图片",
    src: "/slow.png",
  });
  harness.editState({
    hasDrawn: true,
    canvasDataUrl: "canvas:edited-during-load",
    figures: [{ id: "figure-during-load" }],
    selectedId: "figure-during-load",
  });
  harness.loads.get("slow").resolve({ naturalWidth: 400, naturalHeight: 800 });
  await insert;

  assert.equal(harness.history.length, 1);
  assert.equal(harness.history[0].hasDrawn, true);
  assert.equal(harness.history[0].canvasDataUrl, "canvas:edited-during-load");
  assert.deepEqual(harness.history[0].figures, [{ id: "figure-during-load" }]);
  assert.equal(harness.getState().selectedId, "inserted-slow");
});

test("a dropped project image is centered on the pointer instead of the artboard", async () => {
  assert.equal(typeof media.getDroppedMediaPlacement, "function");
  assert.deepEqual(
    media.getDroppedMediaPlacement?.(
      { naturalWidth: 1200, naturalHeight: 800 },
      { width: 1000, height: 600 },
      { x: 25, y: 75 },
    ),
    {
      x: 40,
      y: 310,
      width: 420,
      height: 280,
      rotation: 0,
      flipped: false,
    },
  );
});

test("a dropped project image stays fully inside the artboard near an edge", () => {
  assert.deepEqual(
    media.getDroppedMediaPlacement?.(
      { naturalWidth: 1200, naturalHeight: 800 },
      { width: 1000, height: 600 },
      { x: 95, y: 5 },
    ),
    {
      x: 580,
      y: 0,
      width: 420,
      height: 280,
      rotation: 0,
      flipped: false,
    },
  );
});

test("the media insertion transaction applies a project-image drop position", async () => {
  const harness = createCoordinatorHarness();
  harness.loads.set("dropped", deferred());

  const insert = harness.coordinator.insert(
    {
      id: "dropped",
      label: "拖入的角色图",
      src: "/dropped.png",
    },
    { x: 25, y: 75 },
  );
  harness.loads.get("dropped").resolve({
    naturalWidth: 1200,
    naturalHeight: 800,
  });
  await insert;

  assert.deepEqual(
    {
      x: harness.getState().mediaItems[0].x,
      y: harness.getState().mediaItems[0].y,
    },
    { x: 40, y: 310 },
  );
  assert.equal(harness.getState().selectedId, "inserted-dropped");
});
