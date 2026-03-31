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

void test("recent chat list exposes a lightweight multi-select delete mode", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /selectionMode/);
  assert.match(source, /selectedThreadIds/);
  assert.match(source, /toggleThreadSelection/);
  assert.match(source, /handleDeleteSelected/);
  assert.match(source, /handleSelectAll/);
  assert.match(source, /t\.common\.select/);
  assert.match(source, /t\.common\.selectAll/);
  assert.match(source, /t\.common\.cancel/);
  assert.match(source, /t\.common\.delete/);
});

void test("recent chat list resolves the next thread after batch delete when the active thread is removed", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /resolveNextThreadId/);
  assert.match(source, /router\.push\(pathOfThread\(nextThreadId\)\)/);
});

void test("recent chat list marks project conversations with a project badge and project route", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /projectInfoOfThread/);
  assert.match(source, /项目 ·/);
  assert.match(source, /pathOfProjectThread/);
  assert.match(source, /flex-col/);
  assert.match(source, /projectInfo\.project_name/);
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

void test("recent chat list defines grouped thread ids before handleSelectAll references them", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  const groupsIndex = source.indexOf("const groups =");
  const handleSelectAllIndex = source.indexOf("const handleSelectAll");

  assert.notEqual(groupsIndex, -1);
  assert.notEqual(handleSelectAllIndex, -1);
  assert.ok(
    groupsIndex < handleSelectAllIndex,
    "groups should be declared before handleSelectAll uses it",
  );
});
