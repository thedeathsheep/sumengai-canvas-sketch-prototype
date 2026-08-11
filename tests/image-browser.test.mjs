import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { ImageBrowser } = await vite.ssrLoadModule("/src/App.jsx");

after(async () => {
  await vite.close();
});

test("project images expose drag-to-artboard and click-to-center affordances", () => {
  assert.equal(typeof ImageBrowser, "function");
  const html = renderToStaticMarkup(
    React.createElement(ImageBrowser, {
      open: true,
      onClose() {},
      onInsert() {},
      onDragMove() {},
      onDragDrop() {},
      onDragCancel() {},
      error: "",
    }),
  );

  assert.match(html, /aria-label="拖拽或点击添加角色正面图"/);
  assert.match(html, /title="拖拽到画板，或点击添加到中央"/);
  assert.match(html, /拖拽到画板定位；点击则添加到画面中央/);
});
