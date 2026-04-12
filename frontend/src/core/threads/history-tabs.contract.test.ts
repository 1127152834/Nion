import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace thread history helpers define a fixed two-tab taxonomy", async () => {
  const source = await readFile(
    new URL("./history-tabs.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export type WorkspaceThreadType = "general" \| "bridge"/);
  assert.match(source, /DEFAULT_WORKSPACE_THREAD_TYPE[^=]*= "general"/);
  assert.match(source, /parseWorkspaceThreadType/);
  assert.match(source, /groupThreadsByWorkspaceType/);
  assert.match(source, /filterThreadsByWorkspaceType/);
});
