import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("chat thread page does not expose the workspace terminal toggle", async () => {
  const source = await readFile(
    new URL("../../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /title="Workspace Terminal"/);
  assert.doesNotMatch(source, /<TerminalDrawer/);
});

void test("terminal drawer exposes desktop-only fallback copy", async () => {
  const source = await readFile(new URL("./terminal-drawer.tsx", import.meta.url), "utf8");

  assert.match(source, /DEFAULT_HEIGHT = 250/);
  assert.match(source, /MIN_HEIGHT = 120/);
  assert.match(source, /MAX_HEIGHT = 600/);
  assert.match(source, /工作区终端/);
  assert.match(source, /在当前线程工作目录中执行命令/);
  assert.match(source, /工作区终端仅在桌面版可用/);
});

void test("chat thread page no longer reserves composer layout for the workspace terminal", async () => {
  const source = await readFile(
    new URL("../../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /terminalOpen/);
  assert.doesNotMatch(source, /Workspace Terminal/);
});
