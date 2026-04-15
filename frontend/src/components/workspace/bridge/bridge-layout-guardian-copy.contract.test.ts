import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge layout frames the page as a unified remote entry surface for the same guardian-mode computer", async () => {
  const layoutSource = await readFile(new URL("./BridgeLayout.tsx", import.meta.url), "utf8");
  const sharedSource = await readFile(new URL("./bridge-shared.tsx", import.meta.url), "utf8");

  assert.match(layoutSource, /title=\{t\("bridge\.title"\)\}/);
  assert.match(layoutSource, /description=\{t\("bridge\.description"\)\}/);
  assert.match(layoutSource, /t\("bridge\.summaryTitle"\)/);
  assert.match(layoutSource, /t\("bridge\.summaryDescription"\)/);
  assert.match(layoutSource, /t\("bridge\.summarySameComputer"\)/);
  assert.match(layoutSource, /t\("bridge\.summarySameTasks"\)/);
  assert.match(layoutSource, /t\("bridge\.summarySameQueue"\)/);

  assert.match(sharedSource, /"bridge\.title": "Unified Remote Entry"/);
  assert.match(
    sharedSource,
    /"bridge\.description":\s*"Manage every connected channel as one remote entry surface into the same guardian-mode computer"/,
  );
  assert.match(sharedSource, /"bridge\.summaryTitle": "One remote entry surface"/);
  assert.match(
    sharedSource,
    /"bridge\.summaryDescription":\s*"Telegram, Feishu, Discord, QQ, and WeChat all connect into the same computer, the same task execution context, and the same confirmation queue\."/,
  );
  assert.match(sharedSource, /"bridge\.summarySameComputer": "Same computer"/);
  assert.match(sharedSource, /"bridge\.summarySameTasks": "Same tasks"/);
  assert.match(sharedSource, /"bridge\.summarySameQueue": "Same confirmation queue"/);

  assert.doesNotMatch(sharedSource, /"bridge\.title": "Remote Bridge"/);
  assert.doesNotMatch(
    sharedSource,
    /"bridge\.description": "Control Claude through external channels such as Telegram and Feishu"/,
  );
});
