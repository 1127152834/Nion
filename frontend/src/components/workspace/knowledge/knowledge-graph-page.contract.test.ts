import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge graph page renders graph state and rebuild affordance", async () => {
  const source = await readFile(
    new URL("./knowledge-graph-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useI18n/);
  assert.match(source, /t\.knowledgePage\.graph/);
  assert.match(source, /copy\.title/);
  assert.match(source, /useRebuildKnowledgeGraph/);
  assert.match(source, /rebuild|重建/);
  assert.match(source, /EXTRACTED|INFERRED|AMBIGUOUS/);
  assert.match(source, /nodes|edges/);
  assert.match(source, /knowledge-graph-canvas/);
  assert.match(source, /cluster|聚类/);
  assert.match(source, /@xyflow\/react|ReactFlow/);
  assert.match(source, /loadKnowledgeGraphLayout|saveKnowledgeGraphLayout|graph\/layout/);
  assert.match(source, /layoutDraft/);
  assert.match(source, /setLayoutDraft/);
  assert.match(source, /node_positions:\s*buildNodePositionsFromFlowNodes/);
  assert.match(source, /buildNodePositionsFromFlowNodes\(/);
  assert.match(source, /copy\.nodeCount/);
  assert.match(source, /copy\.clusterCount/);
  assert.doesNotMatch(source, /useEffect\(\(\)\s*=>\s*\{\s*setFlowNodes\(/s);
  assert.doesNotMatch(source, /setFlowNodes\(/);
  assert.doesNotMatch(source, /const baseLayout: KnowledgeGraphLayout = layout \?\?/);
  assert.doesNotMatch(source, /localStorage\.getItem\("knowledge-graph-layout"\)/);
});
