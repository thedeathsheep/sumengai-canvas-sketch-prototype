export function createSaveTransaction(id) {
  return {
    id,
    asset: null,
    node: null,
  };
}

export async function saveAssetStage(transaction, createAsset) {
  if (transaction.asset) return transaction;

  try {
    return {
      ...transaction,
      asset: await createAsset(),
    };
  } catch (error) {
    error.stage = "asset";
    error.transaction = transaction;
    throw error;
  }
}

export async function saveNodeStage(transaction, createNode) {
  if (transaction.node) return transaction;
  if (!transaction.asset) {
    throw new Error("Asset must exist before node creation");
  }

  try {
    return {
      ...transaction,
      node: await createNode(transaction.asset),
    };
  } catch (error) {
    error.stage = "node";
    error.transaction = transaction;
    throw error;
  }
}
