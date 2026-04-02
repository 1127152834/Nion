import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("WorkspaceHeader uses the existing visitGithub workspace copy key", async () => {
  const source = await readFile(new URL("./workspace-container.tsx", import.meta.url), "utf8");

  assert.match(source, /t\.workspace\.visitGithub/);
  assert.doesNotMatch(source, /githubTooltip/);
});
