import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge revision dialog emits revision requests instead of direct editing", async () => {
  const source = await readFile(
    new URL("./knowledge-revision-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /revision/i);
  assert.match(source, /useCreateKnowledgeRevision/);
  assert.match(source, /fix_fact|add_context|merge_pages|split_page|rename_page/);
  assert.doesNotMatch(source, /contentEditable|Textarea/);
});
