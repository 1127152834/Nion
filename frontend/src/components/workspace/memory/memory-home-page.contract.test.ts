import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory home page only exposes user-facing memory content groups", async () => {
  const source = await readFile(
    new URL("./memory-home-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /你的信息|长期背景|事实记忆/);
  assert.match(source, /正在加载记忆|记忆加载失败/);
  assert.doesNotMatch(source, /Agent Growth/);
  assert.doesNotMatch(source, /Memory ledger/);
  assert.doesNotMatch(source, /Memory evidence/);
  assert.doesNotMatch(source, /Runtime trace/);
  assert.doesNotMatch(source, /检索控制台/);
  assert.doesNotMatch(source, /SoulSummaryCard|Soul 设置摘要/);
  assert.doesNotMatch(source, /治理控制台入口/);
  assert.doesNotMatch(source, /如果有错误，直接在对话里告诉我/);
  assert.doesNotMatch(source, /如果这条记错了/);
});
