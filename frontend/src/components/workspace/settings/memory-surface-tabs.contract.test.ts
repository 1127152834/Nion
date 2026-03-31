import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test(
  "memory settings page uses provider console and agent-core tabs as local memory surfaces",
  async () => {
    const tabsSource = await readFile(
      new URL("./memory-surface-tabs.tsx", import.meta.url),
      "utf8",
    );

    assert.match(tabsSource, /surfaces\.provider\.title/);
    assert.match(tabsSource, /surfaces\.console\.title/);
    assert.match(tabsSource, /surfaces\.agentCore\.title/);
  },
);
