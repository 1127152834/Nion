import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation workspace exposes open platform surfaces", async () => {
  const pageSource = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );
  const tabsSource = await readFile(
    new URL("./automation-kind-tabs.tsx", import.meta.url),
    "utf8",
  );
  const sectionSource = await readFile(
    new URL("./open-platform-section.tsx", import.meta.url),
    "utf8",
  ).catch(() => "");

  assert.match(tabsSource, /platform/);
  assert.match(pageSource, /OpenPlatformSection/);
  assert.match(pageSource, /value="platform"/);
  assert.match(sectionSource, /Webhook versions/);
  assert.match(sectionSource, /Plugin actions/);
  assert.match(sectionSource, /Connectors/);
  assert.match(sectionSource, /generic_webhook/);
  assert.match(sectionSource, /echo\.plugin/);
});
