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
  assert.match(source, /resolution\.replay_payload/);
  assert.match(source, /handleReplaySubmit\(resolution\.replay_payload\)/);
  assert.match(source, /handleReplaySubmit\(\{\s*text: resolution\.original_message_text,/s);
  assert.match(source, /resolvePermission\(/);
});

void test("permission request card uses machine-readable actions instead of English label branching", async () => {
  const source = await readFile(
    new URL("./permission-request-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /permissionRequest\.actions/);
  assert.doesNotMatch(source, /selectedOption === "Allow"/);
  assert.doesNotMatch(source, /selectedOption === "Allow Session"/);
  assert.doesNotMatch(source, /selectedOption === "Deny"/);
});

void test("permission request flow exposes resolving/consumed semantics", async () => {
  const cardSource = await readFile(
    new URL("./permission-request-card.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = await readFile(
    new URL("../../../app/workspace/chats/chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(cardSource, /isResolving/);
  assert.match(cardSource, /disabled=\{isResolving/);
  assert.match(pageSource, /consumed/);
});
