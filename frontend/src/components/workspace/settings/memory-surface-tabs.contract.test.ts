import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test(
  "memory surface tabs is retired once dedicated memory pages own page-level navigation",
  async () => {
    const tabsSource = await readFile(
      new URL("./memory-surface-tabs.tsx", import.meta.url),
      "utf8",
    );

    assert.match(tabsSource, /return null/);
    assert.doesNotMatch(tabsSource, /TabsTrigger value="provider"/);
    assert.doesNotMatch(tabsSource, /TabsTrigger value="console"/);
    assert.doesNotMatch(tabsSource, /TabsTrigger value="agent-core"/);
  },
);
