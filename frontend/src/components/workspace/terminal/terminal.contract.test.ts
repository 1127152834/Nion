import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("chat thread page shows terminal toggle only for existing threads", async () => {
  const source = await readFile(
    new URL("../../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /!isNewThread \? \(/);
  assert.match(source, /title="Terminal"/);
  assert.match(source, /<TerminalDrawer/);
});

void test("terminal drawer exposes desktop-only fallback copy", async () => {
  const source = await readFile(new URL("./terminal-drawer.tsx", import.meta.url), "utf8");

  assert.match(source, /DEFAULT_HEIGHT = 250/);
  assert.match(source, /MIN_HEIGHT = 120/);
  assert.match(source, /MAX_HEIGHT = 600/);
  assert.match(source, /Terminal is only available in the desktop app/);
});
