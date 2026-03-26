import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("discord adapter send uses the Discord channel messages REST endpoint", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/adapters/discord-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /DISCORD_REST_API/);
  assert.match(source, /\/channels\/\$\{message\.chatId\}\/messages/);
  assert.match(source, /Authorization: `Bot/);
  assert.match(source, /content:/);
});
