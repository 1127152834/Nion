import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;

async function loadWindowModuleFunctions() {
  const source = fs.readFileSync(new URL("../src/main/window.ts", import.meta.url), "utf8");
  let transformed = source;
  transformed = transformed.replace(/^import .*?;\n/gm, "");
  transformed = transformed.replace(/export async function /g, "async function ");
  transformed = transformed.replace(/export function /g, "function ");
  transformed = transformed.replace(/export type /g, "type ");
  transformed = stripTypeScriptTypes(transformed);
  return new Function(`${transformed}\nreturn { buildMainWindowOptions };`)();
}

test("darwin 主窗口使用隐藏系统标题栏", async () => {
  const { buildMainWindowOptions } = await loadWindowModuleFunctions();
  const windowOptions = buildMainWindowOptions(
    {
      preloadPath: "/tmp/preload.js",
      rendererUrl: "http://127.0.0.1:5173",
    },
    "darwin",
  );

  assert.equal(windowOptions.titleBarStyle, "hiddenInset");
});
