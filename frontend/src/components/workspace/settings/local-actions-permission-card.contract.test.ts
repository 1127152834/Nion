import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("daemon settings page renders the three-mode local-actions permission control", async () => {
  const source = await readFile(
    new URL("./daemon-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /LocalActionsPermissionCard/);
  assert.match(source, /local_actions_permission_mode/);
  assert.match(source, /disabled/);
  assert.match(source, /review_required/);
  assert.match(source, /allow_all/);
});

void test("local actions permission card exposes the three global modes", async () => {
  const source = await readFile(
    new URL("./local-actions-permission-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /LocalActionsPermissionMode/);
  assert.match(source, /"disabled"/);
  assert.match(source, /"review_required"/);
  assert.match(source, /"allow_all"/);
  assert.match(source, /copy\.disabled/);
  assert.match(source, /copy\.reviewRequired/);
  assert.match(source, /copy\.allowAll/);
});
