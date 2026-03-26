import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("legacy model settings editor refreshes runtime model and model-admin caches after save", async () => {
  const source = await readFile(
    new URL("./use-legacy-model-settings-editor.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /useQueryClient/);
  assert.match(
    source,
    /invalidateQueries\(\{ queryKey: \["model-admin", "providers"\] \}\)/,
  );
  assert.match(
    source,
    /invalidateQueries\(\{ queryKey: \["model-admin", "bindings"\] \}\)/,
  );
  assert.match(
    source,
    /invalidateQueries\(\{ queryKey: \["models"\] \}\)/,
  );
});
