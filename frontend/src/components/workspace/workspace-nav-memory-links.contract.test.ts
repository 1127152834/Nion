import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace navigation exposes separate notebook memory and self-maintenance entry points", async () => {
  const source = await readFile(
    new URL("./workspace-nav-menu.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /pathOfNotebook/);
  assert.match(source, /pathOfMemory/);
  assert.match(source, /pathOfSelfMaintenance/);
});
