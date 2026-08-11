const historyLimit = 40;

export function createEditorHistory() {
  return {
    past: [],
    future: [],
  };
}

export function commitEditorSnapshot(history, snapshot) {
  return {
    past: [...history.past, snapshot].slice(-historyLimit),
    future: [],
  };
}

export function undoEditorHistory(history, currentSnapshot) {
  if (!history.past.length) {
    return {
      history,
      snapshot: null,
    };
  }

  return {
    snapshot: history.past.at(-1),
    history: {
      past: history.past.slice(0, -1),
      future: [currentSnapshot, ...history.future].slice(0, historyLimit),
    },
  };
}

export function redoEditorHistory(history, currentSnapshot) {
  if (!history.future.length) {
    return {
      history,
      snapshot: null,
    };
  }

  const [snapshot, ...future] = history.future;
  return {
    snapshot,
    history: {
      past: [...history.past, currentSnapshot].slice(-historyLimit),
      future,
    },
  };
}
