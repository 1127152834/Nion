import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("message list exposes permission request handling alongside clarification cards", async () => {
  const source = await readFile(
    new URL("./message-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /PermissionRequestCard/);
  assert.match(source, /pendingPermissionRequest/);
  assert.match(source, /onPermissionDecision/);
});

void test("chat thread page derives and wires pending permission request state", async () => {
  const source = await readFile(
    new URL("../../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /derivePendingPermissionRequest\(thread\.messages\)/);
  assert.match(source, /pendingPermissionRequest=\{pendingPermissionRequest\}/);
  assert.match(source, /onPermissionDecision=\{handlePermissionDecision\}/);
  assert.match(source, /resolution\.original_message_text/);
  assert.match(source, /text: resolution\.original_message_text/);
  assert.match(source, /resolvePermission\(/);
});
