import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation page exposes an event-task tab and form", async () => {
  const tabsSource = await readFile(
    new URL("./automation-kind-tabs.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(tabsSource, /value="events"/);
  assert.match(pageSource, /EventTaskForm/);
  assert.match(pageSource, /value="events"/);
  assert.match(pageSource, /groupedJobs\.events/);
  assert.match(pageSource, /Need my attention/);
  assert.match(pageSource, /Automation failed alert/);
});
