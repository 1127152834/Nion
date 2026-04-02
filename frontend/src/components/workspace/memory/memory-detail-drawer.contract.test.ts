import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory detail drawer supports timeline and structured detail views", async () => {
  const source = await readFile(
    new URL("./memory-detail-drawer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /detailTimelineTitle/);
  assert.match(source, /detailFactsTitle/);
  assert.match(source, /props\.kind === "history"/);
  assert.match(source, /props\.kind === "user-context"|props\.kind !== "history"/);
  assert.match(source, /bg-primary|rounded-full/);
  assert.doesNotMatch(source, /rounded-2xl/);
  assert.match(source, /recentMonths/);
  assert.match(source, /earlierContext/);
  assert.match(source, /longTermBackground/);
  assert.match(source, /workContext/);
  assert.match(source, /personalContext/);
  assert.match(source, /topOfMind/);
});
