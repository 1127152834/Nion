import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge query page renders a page-based query workflow", async () => {
  const source = await readFile(
    new URL("./knowledge-query-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useI18n/);
  assert.match(source, /t\.knowledgePage\.query/);
  assert.match(source, /copy\.title/);
  assert.match(source, /useKnowledgeQuery/);
  assert.match(source, /useSaveKnowledgeSynthesis/);
  assert.match(source, /useState\(\"\"\)/);
  assert.match(source, /onChange=\{/);
  assert.match(source, /question/);
  assert.match(source, /copy\.saveSynthesis/);
  assert.match(source, /retrieval_policy/);
  assert.match(source, /warnings/);
  assert.match(source, /citations/);
  assert.match(source, /page_state/);
  assert.doesNotMatch(source, /useState\("roadmap"\)/);
  assert.doesNotMatch(source, /notebook/i);
});
