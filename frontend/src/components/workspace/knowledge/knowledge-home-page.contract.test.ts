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
  assert.match(source, /Notebook 是原料层|原始内容/);
  assert.match(source, /compiled pages|已编译页面|source candidates|来源候选/);
  assert.match(source, /broken links|断链/);
  assert.match(source, /activity/i);
  assert.match(source, /job_started|page_created|source_missing_detected|activity feed/i);
  assert.match(source, /compile_state|stage|running|failed/);
  assert.match(source, /activeJob/);
  assert.match(source, /polling|refreshing/i);
  assert.match(source, /stage=\{activeJob\.stage\}/);
  assert.doesNotMatch(source, /Textarea|draftBody|onDraftBodyChange/);
});

void test("knowledge home page can point users to retrieval models when semantic retrieval is unavailable", async () => {
  const source = await readFile(
    new URL("./knowledge-home-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /语义检索增强/);
  assert.match(source, /前往模型管理中的检索模型完成配置/);
});
