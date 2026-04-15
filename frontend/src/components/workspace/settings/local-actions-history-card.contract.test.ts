import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("daemon settings page renders the local-actions history card", async () => {
  const source = await readFile(
    new URL("./daemon-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /LocalActionsHistoryCard/);
  assert.match(source, /useLocalActionsHistory/);
});

void test("local actions history card shows execution audit state", async () => {
  const source = await readFile(
    new URL("./local-actions-history-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /execution\.approval_status/);
  assert.match(source, /execution\.audit_summary/);
  assert.match(source, /goal\.user_input/);
  assert.match(source, /plan\.risk_level/);
});
