import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("clarification card exposes helper copy and adaptive option rendering", async () => {
  const source = await readFile(
    new URL("./clarification-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /t\.toolCalls\.needYourHelp/);
  assert.match(source, /t\.inputBox\.clarificationHelper/);
  assert.match(source, /data-clarification-mode="buttons"/);
  assert.match(source, /data-clarification-mode="select"/);
  assert.match(source, /shouldUseButtonMode/);
  assert.match(source, /t\.inputBox\.clarificationSubmitChoice/);
});
