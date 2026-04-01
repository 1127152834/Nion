import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings storage helpers preserve file and custom modes", async () => {
  const source = await readFile(
    new URL("./memory-settings-page.storage.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /FILE_MEMORY_STORAGE_CLASS/);
  assert.match(source, /inferMemoryStorageMode/);
  assert.match(source, /resolveMemoryStorageModeSelection/);
  assert.match(source, /nextModeOverride/);
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
