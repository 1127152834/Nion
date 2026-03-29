import assert from "node:assert/strict";
import test from "node:test";

const {
  FILE_MEMORY_STORAGE_CLASS,
  inferMemoryStorageMode,
  resolveMemoryStorageModeSelection,
} = await import(
  new URL("./memory-settings-page.storage.ts", import.meta.url).href,
);

void test("inferMemoryStorageMode distinguishes file and custom providers", () => {
  assert.equal(inferMemoryStorageMode(FILE_MEMORY_STORAGE_CLASS), "file");
  assert.equal(
    inferMemoryStorageMode("nion.memory.storage.CustomStorage"),
    "custom",
  );
});

void test("selecting custom from file mode keeps custom mode visible", () => {
  const result = resolveMemoryStorageModeSelection(
    "custom",
    FILE_MEMORY_STORAGE_CLASS,
    "",
  );

  assert.equal(result.nextStoredClass, FILE_MEMORY_STORAGE_CLASS);
  assert.equal(result.nextModeOverride, "custom");
  assert.equal(result.nextCustomDraft, FILE_MEMORY_STORAGE_CLASS);
});

void test("selecting file clears custom draft and restores file storage", () => {
  const result = resolveMemoryStorageModeSelection(
    "file",
    "nion.memory.storage.CustomStorage",
    "nion.memory.storage.CustomStorage",
  );

  assert.equal(result.nextStoredClass, FILE_MEMORY_STORAGE_CLASS);
  assert.equal(result.nextModeOverride, null);
  assert.equal(result.nextCustomDraft, "");
});
