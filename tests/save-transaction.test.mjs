import assert from "node:assert/strict";
import test from "node:test";

let save = {};

try {
  save = await import("../src/saveTransaction.js");
} catch {
  // The first red run proves recoverable save transactions are absent.
}

test("new transactions have no saved asset or node", () => {
  assert.deepEqual(save.createSaveTransaction?.("save-1"), {
    id: "save-1",
    asset: null,
    node: null,
  });
});

test("asset retry creates an asset once after a failed first attempt", async () => {
  let attempts = 0;
  let transaction = save.createSaveTransaction?.("save-1");

  await assert.rejects(
    save.saveAssetStage?.(transaction, async () => {
      attempts += 1;
      throw new Error("asset failed");
    }),
    (error) => error.stage === "asset",
  );

  transaction = await save.saveAssetStage?.(transaction, async () => {
    attempts += 1;
    return { id: "asset-1" };
  });
  transaction = await save.saveAssetStage?.(transaction, async () => {
    attempts += 1;
    return { id: "asset-duplicate" };
  });

  assert.equal(attempts, 2);
  assert.deepEqual(transaction.asset, { id: "asset-1" });
});

test("node retry reuses the saved asset and creates only one successful node", async () => {
  let assetCalls = 0;
  let nodeCalls = 0;
  let transaction = save.createSaveTransaction?.("save-1");

  transaction = await save.saveAssetStage?.(transaction, async () => {
    assetCalls += 1;
    return { id: "asset-1", dataUrl: "data:image/png;base64,x" };
  });

  await assert.rejects(
    save.saveNodeStage?.(transaction, async () => {
      nodeCalls += 1;
      throw new Error("node failed");
    }),
    (error) =>
      error.stage === "node" &&
      error.transaction.asset.id === "asset-1",
  );

  transaction = await save.saveNodeStage?.(transaction, async (asset) => {
    nodeCalls += 1;
    return { id: "node-1", assetId: asset.id };
  });
  transaction = await save.saveNodeStage?.(transaction, async () => {
    nodeCalls += 1;
    return { id: "node-duplicate" };
  });

  assert.equal(assetCalls, 1);
  assert.equal(nodeCalls, 2);
  assert.deepEqual(transaction.node, {
    id: "node-1",
    assetId: "asset-1",
  });
});

test("node creation cannot start before an asset exists", async () => {
  await assert.rejects(
    save.saveNodeStage?.(
      save.createSaveTransaction?.("save-1"),
      async () => ({ id: "node-1" }),
    ),
    /Asset must exist before node creation/,
  );
});
