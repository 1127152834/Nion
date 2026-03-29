import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings page exposes storage mode controls", async () => {
  const source = await readFile(
    new URL("./memory-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /storage_class/);
  assert.match(source, /customStorageClass/);
  assert.match(source, /persistedStorageClass/);
  assert.match(source, /resetStorageEditorState/);
});

void test("memory settings page includes memory management actions and local filters", async () => {
  const source = await readFile(
    new URL("./memory-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useClearMemory/);
  assert.match(source, /useDeleteMemoryFact/);
  assert.match(source, /clearDialogOpen/);
  assert.match(source, /factToDelete/);
  assert.match(source, /ToggleGroup/);
  assert.match(source, /searchPlaceholder/);
});
