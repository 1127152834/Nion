import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("event detail page renders the selected automation event", async () => {
  const pageSource = await readFile(
    new URL("../app/workspace/automation/events/[event_id]/page.tsx", import.meta.url),
    "utf8",
  ).catch(async () =>
    readFile(
      new URL("../../../app/workspace/automation/events/[event_id]/page.tsx", import.meta.url),
      "utf8",
    ),
  );
  const detailSource = await readFile(
    new URL("./automation-event-detail-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /AutomationEventDetailPage/);
  assert.match(detailSource, /Event details/);
  assert.match(detailSource, /Replay event/);
  assert.match(detailSource, /Create event task/);
  assert.match(detailSource, /useAutomationEvent/);
  assert.match(detailSource, /Thread:/);
  assert.match(detailSource, /resolveAutomationEventThreadHref/);
  assert.match(detailSource, /resolveAutomationEventRunHref/);
});
