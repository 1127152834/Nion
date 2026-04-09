import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("soul summary card mirrors settings-facing soul summary instead of console semantics", async () => {
  const source = await readFile(
    new URL("./soul-summary-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /核心人格|说话方式|价值观|关系基调/);
  assert.match(source, /adaptive overlay|临时表达模式/);
  assert.doesNotMatch(source, /Soul Console/);
  assert.doesNotMatch(source, /identity narrative/i);
  assert.doesNotMatch(source, /proposal/i);
  assert.doesNotMatch(source, /growth/i);
});
