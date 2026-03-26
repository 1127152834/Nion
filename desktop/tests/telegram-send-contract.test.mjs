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
