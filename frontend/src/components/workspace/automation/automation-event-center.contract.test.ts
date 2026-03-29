import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation page exposes an event center tab and section", async () => {
  const tabsSource = await readFile(
    new URL("./automation-kind-tabs.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );
  const sectionSource = await readFile(
    new URL("./automation-event-center-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(tabsSource, /eventCenter/);
  assert.match(pageSource, /AutomationEventCenterSection/);
  assert.match(pageSource, /value="eventCenter"/);
  assert.match(sectionSource, /Replay event/);
  assert.match(sectionSource, /Create event task/);
  assert.match(sectionSource, /Filter by category/);
  assert.match(sectionSource, /Filter by event type/);
  assert.match(sectionSource, /Thread:/);
  assert.match(sectionSource, /Run:/);
  assert.match(sectionSource, /resolveAutomationEventThreadHref/);
  assert.match(sectionSource, /resolveAutomationEventRunHref/);
  assert.match(sectionSource, /Event details/);
  assert.match(sectionSource, /summarizeAutomationEvent/);
  assert.match(sectionSource, /\/workspace\/automation\/events\/\$\{event\.event_id\}/);
  assert.match(sectionSource, /Link href=/);
  assert.match(pageSource, /onCreateFromEvent/);
  assert.match(pageSource, /EventTaskDraftCard/);
  assert.match(pageSource, /buildEventTaskRequest/);
  assert.match(pageSource, /categoryFilter/);
  assert.match(pageSource, /eventTypeFilter/);
  assert.match(pageSource, /useAutomationEvents\(\{\s*category:/);
  assert.match(sectionSource, /summarizeAutomationEvent/);
  assert.match(pageSource, /setEventDraft/);
  assert.match(pageSource, /setActiveTab\("events"\)/);
  assert.match(pageSource, /presetDraft=\{eventDraft\}/);
  assert.match(pageSource, /useSearchParams/);
  assert.match(pageSource, /searchParams\.get\("tab"\)/);
  assert.match(pageSource, /searchParams\.get\("run"\)/);
  assert.match(pageSource, /Need my attention/);
  assert.match(pageSource, /Automation failed alert/);
});
