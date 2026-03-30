import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("recent chat list derives pending clarification badges and prioritizes them", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /derivePendingClarification/);
  assert.match(source, /data-pending-reply-label/);
  assert.match(source, /t\.sidebar\.pendingReply/);
  assert.match(source, /const pending = enriched\.filter/);
  assert.match(source, /const ordered = \[\.\.\.pending, \.\.\.regular\]/);
});

void test("recent chat list marks bridge conversations with a platform badge", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /bridgeInfoOfThread/);
  assert.match(source, /bridge\.bridgeChatBadge/);
  assert.match(source, /bridgeLabel/);
});

void test("recent chat list marks project conversations with a project badge and project route", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /projectInfoOfThread/);
  assert.match(source, /项目 ·/);
  assert.match(source, /pathOfProjectThread/);
});

void test("recent chat list groups conversations into project, bridge, and general sections", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /threadGroups/);
  assert.match(source, /label: "项目对话"/);
  assert.match(source, /label: "桥接对话"/);
});
