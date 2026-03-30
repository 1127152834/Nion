import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("event-task detail page shows trigger, action, package files, and recent runs", async () => {
  const source = await readFile(
    new URL("./event-task-detail-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Trigger/);
  assert.match(source, /Action/);
  assert.match(source, /Package directory/);
  assert.match(source, /Recent runs/);
  assert.match(source, /job\.package_manifest/);
  assert.match(source, /Save changes/);
  assert.match(source, /Upload file/);
  assert.match(source, /Create script/);
  assert.match(source, /Remove file/);
  assert.match(source, /ConfirmActionDialog/);
  assert.match(source, /Delete event task/);
  assert.doesNotMatch(source, /Export template/);
  assert.doesNotMatch(source, /Save as template/);
  assert.doesNotMatch(source, /\/workspace\/automation\/templates\//);
  assert.doesNotMatch(source, /exportAutomationJobTemplate|useExportAutomationJobTemplate/);
});
