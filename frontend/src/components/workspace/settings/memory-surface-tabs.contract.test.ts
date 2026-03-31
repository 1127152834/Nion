import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test(
  "memory settings page uses provider console and agent-core tabs as local memory surfaces",
  async () => {
    const [pageSource, tabsSource] = await Promise.all([
      readFile(new URL("./memory-settings-page.tsx", import.meta.url), "utf8"),
      readFile(new URL("./memory-surface-tabs.tsx", import.meta.url), "utf8"),
    ]);

    assert.match(pageSource, /MemorySurfaceTabs/);
    assert.match(pageSource, /surface === "provider"/);
    assert.match(pageSource, /surface === "console"/);
    assert.match(pageSource, /surface === "agent-core"/);
    assert.match(tabsSource, /value="provider"/);
    assert.match(tabsSource, /value="console"/);
    assert.match(tabsSource, /value="agent-core"/);
  },
);
