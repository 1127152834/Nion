import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("human messages disable incomplete markdown parsing", async () => {
  const source = await readFile(new URL("./message-list-item.tsx", import.meta.url), "utf8");

  assert.match(source, /parseIncompleteMarkdown=\{false\}/);
  assert.match(source, /extractKnowledgePageIdsFromToolMessage/);
  assert.match(source, /引用知识页|知识来源/);
  assert.match(source, /knowledge_sources|知识来源/);
});
