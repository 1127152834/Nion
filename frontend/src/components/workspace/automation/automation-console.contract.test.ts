import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation page renders a single console shell instead of tab layout", async () => {
  const pageSource = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /AutomationConsole/);
  assert.doesNotMatch(pageSource, /AutomationKindTabs/);
  assert.doesNotMatch(pageSource, /TabsContent/);
});

void test("automation console composes create list and results panels", async () => {
  const source = await readFile(
    new URL("./automation-console.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /AutomationCreatePanel/);
  assert.match(source, /AutomationListPanel/);
  assert.match(source, /AutomationResultsPanel/);
});

void test("results panel switches scheduled task runs into thread preview mode", async () => {
  const source = await readFile(
    new URL("./automation-results-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /selectedJob\.job_kind === "scheduled_task"/);
  assert.match(source, /AutomationRunPreview/);
  assert.match(source, /isolated_thread_id/);
});
