import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  pathOfNotebook,
  pathOfMemory,
  pathOfSelfMaintenance,
} from "../../core/navigation/desktop-routes.ts";

void test("workspace navigation exposes separate notebook memory and self-maintenance entry points", async () => {
  const source = await readFile(
    new URL("./workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(pathOfNotebook(), "/workspace/notebook");
  assert.equal(pathOfMemory(), "/workspace/memory");
  assert.equal(pathOfSelfMaintenance(), "/workspace/self-maintenance");
  assert.match(source, /const notebookPath = pathOfNotebook\(\)/);
  assert.match(source, /const memoryPath = pathOfMemory\(\)/);
  assert.match(source, /const selfMaintenancePath = pathOfSelfMaintenance\(\)/);
  assert.match(source, /href=\{notebookPath\}/);
  assert.match(source, /href=\{memoryPath\}/);
  assert.match(source, /href=\{selfMaintenancePath\}/);
  assert.match(source, /t\.sidebar\.memory/);
  assert.match(source, /t\.sidebar\.selfMaintenance/);
});
