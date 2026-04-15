import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge revision dialog emits revision requests instead of direct editing", async () => {
  const source = await readFile(
    new URL("./knowledge-revision-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useI18n/);
  assert.match(source, /t\.knowledgePage\.revision/);
  assert.match(source, /useCreateKnowledgeRevision/);
  assert.match(source, /usePreviewKnowledgeRevision/);
  assert.match(source, /useApplyKnowledgeRevision/);
  assert.match(source, /useCloseKnowledgeRevision/);
  assert.match(source, /copy\.requestTypes/);
  assert.doesNotMatch(source, /contentEditable|Textarea/);
});
