import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test(
  "memory provider foundation card references provider family, mode, capability summary, and runtime status metadata",
  async () => {
    const source = await readFile(
      new URL("./memory-provider-foundation-card.tsx", import.meta.url),
      "utf8",
    );

    assert.match(source, /family\.display_name|activeProvider\?\.display_name/);
    assert.match(source, /active provider family|current provider family|provider family/i);
    assert.match(source, /active mode|current mode|runtime mode/i);
    assert.match(source, /supported|partial|unsupported/i);
    assert.match(source, /health|status summary|runtime status/i);
  },
);
