import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("artifact detail exposes explicit save-to-notebook affordance", async () => {
  const source = await readFile(new URL("./artifact-file-detail.tsx", import.meta.url), "utf8");

  assert.match(source, /NotebookFolderPicker/);
  assert.match(source, /useArchiveNotebookAsset/);
  assert.match(source, /saveFromChat|存到笔记|Save to notebook/);
  assert.match(source, /\/mnt\/user-data\/outputs|threadId/);
});

void test("artifact file detail secures new window links with noopener noreferrer", async () => {
  const source = await readFile(new URL("./artifact-file-detail.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /window\.open\(\s*urlOfArtifact\(\{ filepath, threadId \}\),\s*"_blank",\s*"noopener,noreferrer"/m,
  );
  assert.match(
    source,
    /window\.open\(\s*urlOfArtifact\(\{ filepath, threadId, download: true \}\),\s*"_blank",\s*"noopener,noreferrer"/m,
  );
  assert.match(source, /if \(opened\) \{\s*opened\.opener = null;\s*\}/m);
});
