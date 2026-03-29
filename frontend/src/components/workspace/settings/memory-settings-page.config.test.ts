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
