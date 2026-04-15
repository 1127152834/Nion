import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge home page centers overview queue and graph status instead of notebook editing", async () => {
  const source = await readFile(
    new URL("./knowledge-home-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /overview/i);
  assert.match(source, /queue/i);
  assert.match(source, /graph/i);
  assert.match(source, /compiled pages|已编译页面|source candidates|来源候选/);
  assert.match(source, /broken links|断链/);
  assert.doesNotMatch(source, /Textarea|draftBody|onDraftBodyChange/);
});
