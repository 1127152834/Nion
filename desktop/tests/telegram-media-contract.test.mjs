import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("telegram media helper exists for photo and document image downloads", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/adapters/telegram-media.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /downloadTelegramPhoto/);
  assert.match(source, /downloadTelegramDocumentImage/);
  assert.match(source, /getFile/);
  assert.match(source, /file\/bot/);
});
