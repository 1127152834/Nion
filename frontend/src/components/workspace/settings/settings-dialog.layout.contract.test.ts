import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("settings dialog keeps enough viewport height for the knowledge sections", async () => {
  const source = await readFile(
    new URL("./settings-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /h-\[86vh\]/);
  assert.match(source, /max-h-\[calc\(100vh-1rem\)\]/);
  assert.doesNotMatch(source, /h-\[82vh\]/);
  assert.match(source, /space-y-2 pr-1/);
  assert.match(source, /px-3 py-1\.5 text-sm/);
});
