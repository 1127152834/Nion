import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  pathOfMemory,
  pathOfSelfMaintenance,
} from "../../core/navigation/desktop-routes.ts";

void test("workspace navigation exposes separate notebook memory and self-maintenance entry points", async () => {
  const source = await readFile(
    new URL("./workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(pathOfMemory(), "/workspace/memory");
  assert.equal(pathOfSelfMaintenance(), "/workspace/self-maintenance");
  assert.match(source, /pathOfNotebook\(\)/);
  assert.match(source, /pathOfMemory\(\)/);
  assert.match(source, /pathOfSelfMaintenance\(\)/);
});
