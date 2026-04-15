import assert from "node:assert/strict";
import test from "node:test";

const { loadRetrievalModelsStatus } = await import(
  new URL("./api.ts", import.meta.url).href
);

void test("loadRetrievalModelsStatus validates the retrieval models payload", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seenUrl = String(input);
    return new Response(
      JSON.stringify({
        active_profile: {
          embedding: {
            mode: "remote_managed",
            endpoint: "https://example.com/v1/embeddings",
            model_name: "text-embedding-3-large",
            dimensions: 3072,
          },
          reranker: {
            mode: "local_managed",
            model_name: "bge-reranker-large",
          },
        },
        consumers: [
          {
            consumer_id: "memory",
            label: "Memory",
            index_state: "ready",
            rebuild_required: false,
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const result = await loadRetrievalModelsStatus();

    assert.match(seenUrl, /\/api\/retrieval-models\/status$/);
    assert.equal(result.active_profile.embedding.mode, "remote_managed");
    assert.equal(result.active_profile.reranker.mode, "local_managed");
    assert.equal(result.consumers[0]?.consumer_id, "memory");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("loadRetrievalModelsStatus rejects invalid retrieval models payload", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        active_profile: {
          embedding: {
            mode: "remote_managed",
            endpoint: "https://example.com/v1/embeddings",
            model_name: "text-embedding-3-large",
            dimensions: 3072,
          },
        },
        consumers: [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )) as typeof fetch;

  try {
    await assert.rejects(
      () => loadRetrievalModelsStatus(),
      /Invalid retrieval models payload returned from loadRetrievalModelsStatus/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
