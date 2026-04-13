import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge graph page renders graph state and rebuild affordance", async () => {
  const source = await readFile(
    new URL("./knowledge-graph-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /graph/i);
  assert.match(source, /useRebuildKnowledgeGraph/);
  assert.match(source, /rebuild|重建/);
  assert.match(source, /EXTRACTED|INFERRED|AMBIGUOUS/);
});
