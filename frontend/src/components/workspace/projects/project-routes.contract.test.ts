import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace nav chat list exposes a top-level Projects entry", async () => {
  const source = await readFile(
    new URL("../workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /FolderKanbanIcon/);
  assert.match(source, /pathname\.startsWith\("\/workspace\/projects"\)/);
  assert.match(source, /href="\/workspace\/projects"/);
  assert.match(source, /t\.sidebar\.projects/);
});

void test("project thread page reuses the shared chat thread page", async () => {
  const source = await readFile(
    new URL("../../../app/workspace/projects/[project_id]/threads/[thread_id]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /import ChatThreadPage from "@\/app\/workspace\/chats\/chat-thread-page"/);
  assert.match(source, /return <ChatThreadPage \/>/);
});

void test("input box wires @project-thread mentions through project thread import hooks", async () => {
  const source = await readFile(
    new URL("../input-box.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useProjectThreadMentionCandidates/);
  assert.match(source, /useImportProjectThreadSnapshot/);
  assert.match(source, /kind: "project-thread"/);
  assert.match(source, /label: "Project Threads"/);
});
