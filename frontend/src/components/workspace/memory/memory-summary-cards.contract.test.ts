import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory summary cards expose facts updated user-context and history status", async () => {
  const source = await readFile(
    new URL("./memory-summary-cards.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /summaryCards\.factCount/);
  assert.match(source, /summaryCards\.lastUpdated/);
  assert.match(source, /summaryCards\.userContext/);
  assert.match(source, /summaryCards\.historyBackground/);
});
