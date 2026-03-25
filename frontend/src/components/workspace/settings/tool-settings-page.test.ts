import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("tool settings page no longer exposes raw runtime diagnostics", async () => {
  const source = await readFile(new URL("./tool-settings-page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /loaded_source_path/);
  assert.doesNotMatch(source, /loaded_version/);
  assert.doesNotMatch(source, /runtimeStatus\\.warnings\\?\\.map/);
  assert.doesNotMatch(source, /info\\.reason/);
});
