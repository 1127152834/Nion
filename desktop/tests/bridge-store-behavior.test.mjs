import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;
const requireFn = nodeModule.createRequire(import.meta.url);

async function loadModuleFunctions(fileRelativePath, exportedNames) {
  const source = fs.readFileSync(
    new URL(fileRelativePath, import.meta.url),
    "utf8",
  );
  let transformed = source;
  transformed = transformed.replace(/^import .*?;\n/gm, "");
  for (const name of exportedNames) {
    transformed = transformed.replace(
      new RegExp(`export function ${name}`, "g"),
      `function ${name}`,
    );
    transformed = transformed.replace(
      new RegExp(`export type ${name}`, "g"),
      `type ${name}`,
    );
  }
  transformed = stripTypeScriptTypes(transformed);
  return new Function(
    "require",
    "fs",
    "path",
    "randomUUID",
    `${transformed}\nreturn { ${exportedNames.join(", ")} };`,
  )(
    requireFn,
    fs,
    path,
    requireFn("node:crypto").randomUUID,
  );
}

test("bridge settings store round-trips saved settings", async () => {
  const { createBridgeSettingsStore } = await loadModuleFunctions(
    "../src/main/bridge/settings-store.ts",
    ["createBridgeSettingsStore"],
  );

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nion-bridge-settings-"));
  const store = createBridgeSettingsStore(path.join(tempDir, "settings.json"));

  assert.deepEqual(store.loadSettings().settings, {});

  store.saveSettings({ bridge_feishu_enabled: "true" });
  assert.equal(store.loadSettings().settings.bridge_feishu_enabled, "true");
});

test("bridge bindings store upserts by platform and chat id", async () => {
  const { createBridgeBindingsStore } = await loadModuleFunctions(
    "../src/main/bridge/bindings-store.ts",
    ["createBridgeBindingsStore"],
  );

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nion-bridge-bindings-"));
  const store = createBridgeBindingsStore(path.join(tempDir, "bindings.json"));

  const first = store.upsertBinding({
    platform: "feishu",
    chatId: "chat-1",
    threadId: "thread-1",
    workingDirectory: "/tmp/project-a",
    active: true,
  });
  const second = store.upsertBinding({
    platform: "feishu",
    chatId: "chat-1",
    threadId: "thread-2",
    workingDirectory: "/tmp/project-b",
    active: false,
  });

  assert.equal(first.id, second.id);
  assert.equal(store.listBindings().length, 1);
  assert.equal(store.listBindings()[0].threadId, "thread-2");
});
