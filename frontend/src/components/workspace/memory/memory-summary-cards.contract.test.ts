import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory summary cards keep summary coverage without nested bordered container styling", async () => {
  const source = await readFile(
    new URL("./memory-summary-cards.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /summaryCards\.factCount/);
  assert.match(source, /summaryCards\.lastUpdated/);
  assert.match(source, /summaryCards\.userContext/);
  assert.match(source, /summaryCards\.historyBackground/);
  assert.match(source, /text-\[11px\].*uppercase/s);
  assert.match(source, /text-\[1\.9rem\]|text-\[2rem\]/);
  assert.match(source, /xl:grid-cols-4/);
  assert.match(source, /rounded-md/);
  assert.doesNotMatch(source, /rounded-2xl/);
  assert.doesNotMatch(
    source,
    /grid gap-3 rounded-lg border border-\[color:var\(--border\)\] bg-background/,
  );
  assert.match(source, /className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"/);
});
