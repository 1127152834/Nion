import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings page exposes storage mode controls", async () => {
  const source = await readFile(
    new URL("./memory-provider-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /storageMode/);
  assert.match(source, /customStorageClass/);
  assert.match(source, /onStorageModeChange/);
  assert.match(source, /onCustomStorageClassChange/);
});

void test("memory settings page includes memory management actions and local filters", async () => {
  const source = await readFile(
    new URL("./memory-console-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /onClearAll/);
  assert.match(source, /onDeleteFact/);
  assert.match(source, /ToggleGroup/);
  assert.match(source, /searchPlaceholder/);
});
