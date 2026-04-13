import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("WorkspaceHeader uses the existing visitGithub workspace copy key", async () => {
  const source = await readFile(
    new URL("./workspace-container.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /t\.workspace\.visitGithub/);
  assert.doesNotMatch(source, /githubTooltip/);
});

void test("WorkspaceHeader exposes a desktop drag region while keeping actions interactive", async () => {
  const source = await readFile(
    new URL("./workspace-container.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useIsDesktopShell/);
  assert.match(
    source,
    /data-desktop-drag-region=\{[\s\S]*isDesktopShell \? "workspace-header" : undefined[\s\S]*\}/,
  );
  assert.match(source, /\[-webkit-app-region:drag\]/);
  assert.match(
    source,
    /data-desktop-no-drag=\{[\s\S]*isDesktopShell \? "workspace-header-content" : undefined[\s\S]*\}/,
  );
  assert.match(source, /\[-webkit-app-region:no-drag\]/);
});
