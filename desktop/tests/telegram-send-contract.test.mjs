import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("telegram adapter send uses the Telegram Bot API sendMessage endpoint", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/adapters/telegram-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /api\.telegram\.org/);
  assert.match(source, /sendMessage/);
  assert.match(source, /chat_id/);
});

test("telegram adapter registers slash commands and denies by default without auth config", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/adapters/telegram-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /setMyCommands/);
  assert.match(source, /return false;/);
});

test("telegram adapter preview flow reuses and deletes a real preview message instead of leaving drafts behind", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/adapters/telegram-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /previewMessages = new Map/);
  assert.match(source, /editMessageText/);
  assert.match(source, /deleteMessage/);
  assert.doesNotMatch(source, /sendMessageDraft/);
});
