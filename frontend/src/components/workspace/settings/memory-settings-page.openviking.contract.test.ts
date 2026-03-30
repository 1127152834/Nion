import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings page exposes embedded openviking notebook controls", async () => {
  const source = await readFile(
    new URL("./memory-agent-core-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /AutoDream|autodream/);
  assert.match(source, /Dream Log|梦境日志|agent_memory_updates|action_proposals/);
  assert.match(source, /openviking\.reindexButton|reindexingButton/);
  assert.match(source, /openviking\.searchPlaceholder|searchButton/);
  assert.match(source, /source_relative_path|heading_path|snippet|markdown/);
});
