import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workflow list shows latest run state and resume entrypoint", async () => {
  const pageSource = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );
  const sectionSource = await readFile(
    new URL("./workflow-job-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /WorkflowJobSection/);
  assert.match(sectionSource, /Latest run/);
  assert.match(sectionSource, /Resume workflow/);
  assert.match(sectionSource, /current_step_id/);
  assert.match(sectionSource, /failed_step_id/);
  assert.match(sectionSource, /useResumeWorkflowRun/);
});
