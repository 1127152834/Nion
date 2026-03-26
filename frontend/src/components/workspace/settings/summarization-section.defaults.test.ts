import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("summarization section seeds token triggers with a 20k default", async () => {
  const source = await readFile(
    new URL("./configuration/sections/summarization-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /DEFAULT_SUMMARIZATION_TOKEN_LIMIT = 20480/);
  assert.match(source, /list\.push\(\{ type: "tokens", value: DEFAULT_SUMMARIZATION_TOKEN_LIMIT \}\)/);
  assert.match(source, /String\(DEFAULT_SUMMARIZATION_TOKEN_LIMIT\)/);
});
