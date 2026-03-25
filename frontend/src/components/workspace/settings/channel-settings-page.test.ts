import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("channel settings page removes the single workspace explainer card", async () => {
  const source = await readFile(
    new URL("./channel-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /singleWorkspacePath/);
  assert.doesNotMatch(source, /workspaceTitle/);
});
