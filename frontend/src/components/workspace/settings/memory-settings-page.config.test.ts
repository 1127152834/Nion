import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings storage helpers preserve file and custom modes", async () => {
  const source = await readFile(
    new URL("./memory-settings-page.storage.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /MEMORY_OS_RUNTIME_BACKEND/);
  assert.match(source, /inferMemoryStorageMode/);
  assert.match(source, /resolveMemoryStorageModeSelection/);
  assert.match(source, /nextModeOverride/);
});

void test("memory settings page includes memory management actions and local filters", async () => {
  const source = await readFile(
    new URL("./memory-console-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /onOpenDangerZone/);
  assert.match(source, /onDeleteFact/);
  assert.match(source, /ToggleGroup/);
  assert.match(source, /searchPlaceholder/);
});

void test("memory settings page reuses the unified visual memory surface instead of markdown rendering", async () => {
  const source = await readFile(new URL("./settings-dialog.tsx", import.meta.url), "utf8");

  assert.match(source, /MemoryPage/);
  assert.doesNotMatch(source, /MemorySettingsPage/);
});
