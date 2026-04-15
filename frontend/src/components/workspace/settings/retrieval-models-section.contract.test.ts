import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("retrieval models section assembles the Task 8 retrieval cards", async () => {
  const source = await readFile(
    new URL("./retrieval-models-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /检索模型|Retrieval/);
  assert.match(source, /正在读取检索模型状态|Loading retrieval model status/);
  assert.match(source, /RetrievalRecommendedStackCard/);
  assert.match(source, /RetrievalConsumersCard/);
  assert.match(source, /status\.active_profile\.embedding\.model_name/);
  assert.match(source, /status\.active_profile\.reranker\.model_name/);
  assert.match(source, /status\.consumers\.length/);
  assert.match(source, /status\.consumers/);
  assert.match(source, /useSaveRetrievalModelsProfile/);
  assert.match(source, /useTestRetrievalEmbeddingProfile/);
  assert.match(source, /useTestRetrievalRerankerProfile/);
  assert.match(source, /useRebuildRetrievalConsumerIndexes/);
  assert.match(source, /useDesktopRetrievalCatalog/);
  assert.match(source, /useDesktopRetrievalModelActions/);
  assert.match(source, /downloadPack|downloadModel/);
  assert.match(source, /RetrievalLocalPacksCard/);
});

void test("retrieval model cards expose local and api modes", async () => {
  const embeddingSource = await readFile(
    new URL("./retrieval-embedding-card.tsx", import.meta.url),
    "utf8",
  );
  const rerankerSource = await readFile(
    new URL("./retrieval-reranker-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(embeddingSource, /本地模型/);
  assert.match(embeddingSource, /API/);
  assert.match(embeddingSource, /localModels/);
  assert.match(rerankerSource, /本地模型/);
  assert.match(rerankerSource, /API/);
  assert.match(rerankerSource, /localModels/);
});
