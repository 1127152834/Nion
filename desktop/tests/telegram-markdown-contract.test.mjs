import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("telegram markdown renderer converts markdown to Telegram HTML markers", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/markdown/telegram.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /renderTelegramHtml/);
  assert.match(source, /<b>/);
  assert.match(source, /<i>/);
  assert.match(source, /<code>/);
  assert.match(source, /<a href=/);
});
