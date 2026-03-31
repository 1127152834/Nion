import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory page excludes notebook semantics and focuses on memory operations", async () => {
  const source = await readFile(
    new URL("./memory-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /t\.workspaceSurfaces\.memory\.title/);
  assert.match(source, /t\.workspaceSurfaces\.memory\.consoleTitle/);
  assert.match(source, /t\.workspaceSurfaces\.memory\.recallTitle/);
  assert.match(source, /t\.workspaceSurfaces\.memory\.recallDescription/);
  assert.doesNotMatch(source, /Memory Provider|Memory Console|Memory Search/);
  assert.doesNotMatch(source, /Notebook|Knowledge Base|reindex notebook/i);
});
