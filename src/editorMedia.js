export function getInitialMediaPlacement(image, artboard) {
  const scale = Math.min(
    1,
    (artboard.width * 0.42) / image.naturalWidth,
    (artboard.height * 0.6) / image.naturalHeight,
  );
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);

  return {
    x: Math.round((artboard.width - width) / 2),
    y: Math.round((artboard.height - height) / 2),
    width,
    height,
    rotation: 0,
    flipped: false,
  };
}

export function moveMediaLayer(items, id, direction) {
  const index = items.findIndex((item) => item.id === id);
  const target = direction === "forward" ? index + 1 : index - 1;

  if (index < 0 || target < 0 || target >= items.length) {
    return items;
  }

  const reordered = [...items];
  [reordered[index], reordered[target]] = [
    reordered[target],
    reordered[index],
  ];
  return reordered;
}

export function getElementDropPosition(pointer, artboardRect) {
  const toPercent = (value, start, size) =>
    Math.round(((value - start) / size) * 10000) / 100;
  const clamp = (value, minimum, maximum) =>
    Math.min(maximum, Math.max(minimum, value));

  return {
    x: clamp(
      toPercent(pointer.clientX, artboardRect.left, artboardRect.width),
      4,
      92,
    ),
    y: clamp(
      toPercent(pointer.clientY, artboardRect.top, artboardRect.height),
      4,
      92,
    ),
  };
}

export function getElementDropPlacement(pointer, artboardRect) {
  const isInside =
    pointer.clientX >= artboardRect.left &&
    pointer.clientX <= artboardRect.left + artboardRect.width &&
    pointer.clientY >= artboardRect.top &&
    pointer.clientY <= artboardRect.top + artboardRect.height;

  return isInside ? getElementDropPosition(pointer, artboardRect) : null;
}

export function preventNativeAssetDrag(event) {
  event.preventDefault();
}

export function shouldStartAssetPointerDrag(drag, pointer, threshold = 6) {
  if (!drag || drag.pointerId !== pointer.pointerId) return false;
  return (
    Math.hypot(
      pointer.clientX - drag.startX,
      pointer.clientY - drag.startY,
    ) >= threshold
  );
}

export function armTransientAssetClickSuppression(
  guard,
  defer = (callback) => window.setTimeout(callback, 0),
) {
  guard.current = true;
  defer(() => {
    guard.current = false;
  });
}

export function getDroppedMediaPlacement(image, artboard, dropPosition) {
  const placement = getInitialMediaPlacement(image, artboard);
  const centerX = (dropPosition.x / 100) * artboard.width;
  const centerY = (dropPosition.y / 100) * artboard.height;

  return {
    ...placement,
    x: Math.round(
      Math.min(
        artboard.width - placement.width,
        Math.max(0, centerX - placement.width / 2),
      ),
    ),
    y: Math.round(
      Math.min(
        artboard.height - placement.height,
        Math.max(0, centerY - placement.height / 2),
      ),
    ),
  };
}

export function createMediaInsertCoordinator({
  loadImage,
  getLatestState,
  getArtboard,
  createId,
  commit,
}) {
  let latestRequestToken = 0;

  return {
    async insert(asset, dropPosition = null) {
      const requestToken = ++latestRequestToken;
      const image = await loadImage(asset);
      const previousState = getLatestState();
      const id = createId(asset);
      const artboard = getArtboard();
      const item = {
        ...asset,
        ...(dropPosition
          ? getDroppedMediaPlacement(image, artboard, dropPosition)
          : getInitialMediaPlacement(image, artboard)),
        id,
        scale: 1,
      };
      const shouldSelect = requestToken === latestRequestToken;
      const nextState = {
        ...previousState,
        mediaItems: [...previousState.mediaItems, item],
        selectedId: shouldSelect ? id : previousState.selectedId,
        activeTool: shouldSelect ? "select" : previousState.activeTool,
      };
      const transition = {
        requestToken,
        shouldSelect,
        item,
        previousState,
        nextState,
      };

      commit(transition);
      return transition;
    },
  };
}
