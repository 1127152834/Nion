import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("discord markdown chunker preserves code fences across chunks", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/markdown/discord.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /markdownToDiscordChunks/);
  assert.match(source, /openFence/);
  assert.match(source, /```/);
});
