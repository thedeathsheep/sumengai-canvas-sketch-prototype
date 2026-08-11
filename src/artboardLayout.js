export const artboardRatioOptions = [
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "3:4", label: "3:4", value: 3 / 4 },
];

export function getAspectRatioValue(id) {
  return (
    artboardRatioOptions.find((option) => option.id === id)?.value ??
    artboardRatioOptions[0].value
  );
}

export function getAvailableArtboardSize(viewport) {
  return {
    width: Math.max(320, Math.min(1266, viewport.width - 160)),
    height: Math.max(240, viewport.height - 305),
  };
}

export function getContainTransform(fromSize, toSize) {
  const scale = Math.min(
    toSize.width / fromSize.width,
    toSize.height / fromSize.height,
  );

  return {
    scale,
    offsetX: (toSize.width - fromSize.width * scale) / 2,
    offsetY: (toSize.height - fromSize.height * scale) / 2,
  };
}

export function getFitArtboardSize(availableSize, aspectRatio) {
  const availableAspect = availableSize.width / availableSize.height;
  if (aspectRatio >= availableAspect) {
    return {
      width: availableSize.width,
      height: availableSize.width / aspectRatio,
    };
  }

  return {
    width: availableSize.height * aspectRatio,
    height: availableSize.height,
  };
}

export function transformPoint(point, transform) {
  return {
    x: point.x * transform.scale + transform.offsetX,
    y: point.y * transform.scale + transform.offsetY,
  };
}

export function transformEditorObjects(snapshot, fromSize, toSize) {
  const transform = getContainTransform(fromSize, toSize);

  return {
    figures: snapshot.figures.map((item) => {
      const position = transformPoint(
        {
          x: (item.x / 100) * fromSize.width,
          y: (item.y / 100) * fromSize.height,
        },
        transform,
      );

      return {
        ...item,
        x: (position.x / toSize.width) * 100,
        y: (position.y / toSize.height) * 100,
        scale: item.scale * transform.scale,
      };
    }),
    mediaItems: snapshot.mediaItems.map((item) => ({
      ...item,
      ...transformPoint(item, transform),
      scale: item.scale * transform.scale,
    })),
    textItems: snapshot.textItems.map((item) => ({
      ...item,
      ...transformPoint(item, transform),
    })),
  };
}
