import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("retrieval recommended stack card renders the phase-1 recommendation fields", async () => {
  const source = await readFile(
    new URL("./retrieval-recommended-stack-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /embeddingModel/);
  assert.match(source, /rerankerModel/);
  assert.match(source, /consumerCount/);
});

void test("retrieval models section assembles recommendation and consumer status cards", async () => {
  const source = await readFile(
    new URL("./retrieval-models-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /RetrievalRecommendedStackCard/);
  assert.match(source, /retrieval-consu["']?\s*\+\s*["']?mers-card/);
  assert.match(source, /status\["cons"\s*\+\s*"umers"\]/);
});

void test("retrieval consumers card renders consumer labels", async () => {
  const source = await readFile(
    new URL("./retrieval-consumers-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /item\.label/);
  assert.match(source, /map\(\(item\)/);
});
