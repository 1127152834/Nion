import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("input box supports pending clarification reply mode", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.match(source, /pendingClarification\?: PendingClarification \| null/);
  assert.match(source, /t\.inputBox\.clarificationReplying/);
  assert.match(source, /t\.inputBox\.clarificationPlaceholder/);
  assert.match(source, /pendingClarification\.question/);
});

void test("chat thread page derives and wires pending clarification state", async () => {
  const source = await readFile(
    new URL("../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /derivePendingClarification\(thread\.messages\)/);
  assert.match(source, /pendingClarification=\{pendingClarification\}/);
  assert.match(source, /onClarificationSelect=\{handleClarificationSelect\}/);
  assert.match(source, /text: option/);
});

void test("chat thread page keeps the composer centered in the same content container", async () => {
  const source = await readFile(
    new URL("../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /className="mx-auto flex w-full max-w-\(--container-width-md\) flex-col gap-3 pt-4"/);
  assert.doesNotMatch(source, /className="relative w-full max-w-\(--container-width-md\)"/);
});

void test("input box model selector only renders display names", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.match(source, /\{selectedModel\?\.display_name\}/);
  assert.match(source, /<ModelSelectorName>\{m\.display_name\}<\/ModelSelectorName>/);
  assert.doesNotMatch(source, /\{selectedModel\.model\}/);
  assert.doesNotMatch(source, /\{m\.model\}/);
});
