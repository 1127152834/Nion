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
  assert.match(source, /Export template/);
  assert.match(source, /Save as template/);
  assert.match(source, /router\.push/);
  assert.match(source, /\/workspace\/automation\/templates\//);
  assert.match(source, /exportTemplate\.mutateAsync/);
  assert.match(source, /exportAutomationJobTemplate|useExportAutomationJobTemplate/);
});
