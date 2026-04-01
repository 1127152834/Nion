import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace menu exposes a notebook entry without duplicating it in the primary nav list", async () => {
  const chatListSource = await readFile(
    new URL("./workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );
  const navMenuSource = await readFile(
    new URL("./workspace-nav-menu.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(chatListSource, /\/workspace\/notebook/);
  assert.match(navMenuSource, /pathOfNotebook/);
});

void test("desktop renderer registers the notebook route", async () => {
  const source = await readFile(
    new URL("../../../../desktop/src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\/workspace\/notebook/);
  assert.match(source, /\/workspace\/notebook\/trash/);
});

void test("notebook page supports seeded create flow from query params", async () => {
  const source = await readFile(
    new URL("./notebook/notebook-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /searchParams\.get\("create"\)/);
  assert.match(source, /searchParams\.get\("body"\)/);
});

void test("chat thread page exposes a save to notebook action", async () => {
  const source = await readFile(
    new URL("../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /SaveToNotebookTrigger/);
});

void test("notebook page exposes the shell-based assistant entry points", async () => {
  const source = await readFile(
    new URL("./notebook/notebook-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /notebookAssistantSessionId/);
  assert.match(source, /startNotebookAssistantConversation/);
  assert.match(source, /<NotebookContextPanel/);
  assert.match(source, /pathOfNotebookTrash/);
});
