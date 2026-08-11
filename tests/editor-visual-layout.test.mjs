import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ruleFor(selector) {
  return new RegExp(`${escapeRegExp(selector)}\\s*\\{[^}]*\\}`, "s");
}

test("editor defines the cinematic stage tokens", () => {
  for (const token of [
    "--editor-header-height: 64px",
    "--editor-workspace: #0d1013",
    "--editor-float-surface: #1b1f23",
    "--editor-float-border:",
    "--editor-z-controls: 20",
    "--editor-z-popover: 30",
  ]) {
    assert.match(css, new RegExp(escapeRegExp(token)));
  }
});

test("editor chrome uses a full-screen stage and bottom command dock", () => {
  assert.match(
    css.match(ruleFor(".editor-header"))?.[0] ?? "",
    /height:\s*var\(--editor-header-height\)/,
  );

  assert.match(css, /\.editor-shell\s*\{[^}]*width:\s*100vw[^}]*height:\s*100vh/s);
  assert.match(css, /\.editor-tool-rail\s*\{[^}]*bottom:\s*18px[^}]*flex-direction:\s*row/s);
  assert.match(css, /\.editor-context-bar\s*\{[^}]*bottom:\s*108px/s);
  assert.match(css, /\.session-layers-panel\s*\{[^}]*inset:\s*18px 0 0 auto/s);
});

test("editor keeps the compact responsive layout contracts", () => {
  assert.match(
    css,
    /\.editor-stage\s*\{[^}]*padding:\s*22px\s+42px\s+154px/s,
  );
  assert.match(css, /@media\s*\(max-width:\s*1079px\)/);
  assert.match(css, /@media\s*\(max-width:\s*899px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
