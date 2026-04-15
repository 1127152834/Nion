import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("daemon settings page reframes daemon surface as guardian mode status", async () => {
  const source = await readFile(
    new URL("./daemon-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /GuardianModeStatusCard/);
  assert.match(source, /Guardian mode|值守模式/);
  assert.match(source, /getDesktopRuntimeInfo|getDesktopRuntimeInfo\(/);
  assert.doesNotMatch(source, /const guardianStatus = allowBackgroundRunning/);
});

void test("guardian mode status card exposes the three runtime states and descriptive copy", async () => {
  const source = await readFile(
    new URL("./guardian-mode-status-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /standing_by/);
  assert.match(source, /busy/);
  assert.match(source, /offline/);
  assert.match(source, /Guardian mode|值守模式/);
});
