import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("batch describe dialog exposes skip-existing and tool count summary", async () => {
  const source = await readFile(
    new URL("./cli-tool-batch-describe-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /skipExisting/);
  assert.match(source, /toolIds\.some\(\(toolId\) => Boolean\(existingDescriptions\[toolId\]\)\)/);
  assert.match(source, /toolsToProcess/);
  assert.match(source, /toolIds\.length/);
});

void test("batch describe dialog only commits results when not aborted", async () => {
  const source = await readFile(
    new URL("./cli-tool-batch-describe-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /if \(!controller\.signal\.aborted && Object\.keys\(resultsRef\.current\)\.length > 0\)/);
  assert.match(source, /if \(!controller\.signal\.aborted\) \{\s*setPhase\("done"\)/);
});

void test("batch describe dialog surfaces per-tool error text and done-state summary", async () => {
  const source = await readFile(
    new URL("./cli-tool-batch-describe-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /result\.status === "error" && result\.error/);
  assert.match(source, /errorCount/);
  assert.match(source, /successCount/);
});
