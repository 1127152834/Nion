import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("chat thread page no longer exposes the top-right artifact trigger", async () => {
  const source = await readFile(
    new URL("../../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /<ArtifactTrigger\s*\/>/);
});

void test("agent chat page no longer exposes the top-right artifact trigger", async () => {
  const source = await readFile(
    new URL("../../../app/workspace/agents/agent-chat-page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /<ArtifactTrigger\s*\/>/);
});
