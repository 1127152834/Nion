import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("message list renders internal summaries as a compact toggle with expandable body", async () => {
  const source = await readFile(new URL("./message-list.tsx", import.meta.url), "utf8");

  assert.match(source, /group\.type === "system:internal-summary"/);
  assert.match(source, /groupMessages\(messages, \(group, index\)/);
  assert.match(source, /getInternalSummaryItemId/);
  assert.match(source, /toggleInternalSummaryOpen/);
  assert.match(source, /type="button"/);
  assert.match(source, /MarkdownContent/);
});

void test("message list forwards threadId into each message item so uploads and image artifacts can resolve URLs", async () => {
  const source = await readFile(new URL("./message-list.tsx", import.meta.url), "utf8");

  assert.match(source, /<MessageListItem[\s\S]*threadId=\{threadId\}/);
});
