import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("recent chat list derives pending clarification badges and prioritizes them", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /derivePendingClarification/);
  assert.match(source, /t\.sidebar\.pendingReply/);
  assert.match(source, /pendingClarification: Boolean/);
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
  assert.match(source, /router\.push\(pathOfThread\(nextThreadId,\s*\{\s*type:/);
});

void test("recent chat list marks project conversations with a project badge and project route", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /WorkspaceThreadListItem/);
  assert.match(source, /WorkspaceThreadListItem/);
});

void test("recent chat list groups conversations into project, bridge, and general sections", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /searchParams\.get\("type"\)/);
  assert.match(source, /groupThreadsByWorkspaceType/);
  assert.match(source, /pathOfThread\(nextThreadId,\s*\{\s*type:/);
  assert.match(source, /ThreadTypeTabs/);
  assert.match(source, /scope="sidebar"/);
});

void test("recent chat list scopes selection to the active thread type", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /activeGroup/);
  assert.match(source, /activeGroup\.map/);
  assert.match(source, /setSelectedThreadIds\(\[\]\)/);
  assert.match(source, /WorkspaceThreadListItem/);
});
