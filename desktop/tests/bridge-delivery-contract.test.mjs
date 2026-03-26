import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop bridge delivery layer provides chunking and retry entrypoints", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/delivery-layer.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /chunkBridgeText/);
  assert.match(source, /deliverBridgeMessage/);
  assert.match(source, /sendWithRetry/);
  assert.match(source, /BridgeChatRateLimiter/);
  assert.match(source, /renderTelegramHtml/);
  assert.match(source, /markdownToDiscordChunks/);
});
