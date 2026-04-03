import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory history page focuses on history content only", async () => {
  const source = await readFile(
    new URL("./memory-history-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /markdown\.recentMonths|markdown\.earlierContext|markdown\.longTermBackground/,
  );
  assert.doesNotMatch(source, /MemoryConsolePanel/);
  assert.doesNotMatch(source, /markdown\.personal/);
});
