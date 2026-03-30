import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test(
  "memory provider foundation card references provider families and openviking modes",
  async () => {
    const source = await readFile(
      new URL("./memory-provider-foundation-card.tsx", import.meta.url),
      "utf8",
    );

    assert.match(source, /Built-in|Mem0|OpenViking/);
    assert.match(source, /embedded|remote/i);
    assert.match(source, /Embedded OpenViking|Remote OpenViking|describeOpenVikingMode/);
  },
);
