import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("chat thread page shows terminal toggle only for existing threads", async () => {
  const source = await readFile(
    new URL("../../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /!isNewThread \? \(/);
  assert.match(source, /title="Workspace Terminal"/);
  assert.match(source, /<TerminalDrawer/);
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

void test("chat thread page docks terminal below the composer stack instead of overlapping it", async () => {
  const source = await readFile(
    new URL("../../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /absolute right-0 bottom-0 left-0 z-30 flex justify-center px-4/);
  assert.match(source, /"shrink-0 px-4"/);
  assert.match(source, /terminalOpen \? "pb-0" : "pb-4"/);
});
