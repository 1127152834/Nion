import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace navigation exposes separate notebook memory and self-maintenance entry points", async () => {
  const source = await readFile(
    new URL("./workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\/workspace\/notebook/);
  assert.match(source, /\/workspace\/memory/);
  assert.match(source, /\/workspace\/self-maintenance/);
});
