import assert from "node:assert/strict";
import test from "node:test";

const {
  loadRetrievalModelsStatus,
  saveRetrievalModelsProfile,
  testRetrievalEmbeddingProfile,
  testRetrievalRerankerProfile,
  rebuildRetrievalConsumerIndexes,
} = await import(
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
            provider: "local_onnx",
            model_id: "zh-embedding-lite",
            endpoint: "",
            model_name: "jina-embeddings-v2-base-zh",
            dimensions: 768,
            api_key_configured: false,
            display_name: "Jina Embeddings v2 Base ZH (INT8)",
          },
          reranker: {
            provider: "local_onnx",
            model_id: "zh-rerank-lite",
            endpoint: "",
            model_name: "jina-reranker-v2-base-multilingual",
            api_key_configured: false,
            display_name: "Jina Reranker v2 Base Multilingual (Quantized)",
          },
        },
        local_models: {
          embedding: [
            {
              model_id: "zh-embedding-lite",
              family: "embedding",
              display_name: "Jina Embeddings v2 Base ZH (INT8)",
              locale: "zh-CN",
              installed: false,
              downloading: false,
            },
          ],
          rerank: [
            {
              model_id: "zh-rerank-lite",
              family: "rerank",
              display_name: "Jina Reranker v2 Base Multilingual (Quantized)",
              locale: "zh-CN",
              installed: false,
              downloading: false,
            },
          ],
        },
        recommended_profiles: [
          {
            profile_id: "zh-local-default",
            label: "中文本地推荐",
            mode: "local",
            embedding_model_id: "zh-embedding-lite",
            reranker_model_id: "zh-rerank-lite",
          },
        ],
        consumers: [
          {
            consumer_id: "memory",
            label: "Memory",
            index_state: "ready",
            rebuild_required: false,
          },
        ],
        capability: {
          local_prepare_enabled: false,
          remote_config_enabled: true,
          test_enabled: true,
          rebuild_enabled: true,
          status_only: false,
        },
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
    assert.equal(result.active_profile.embedding.provider, "local_onnx");
    assert.equal(result.active_profile.reranker.provider, "local_onnx");
    assert.equal(result.local_models.embedding[0]?.model_id, "zh-embedding-lite");
    assert.equal(result.recommended_profiles[0]?.profile_id, "zh-local-default");
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
            provider: "openai_compatible",
            model_id: null,
            endpoint: "https://example.com/v1/embeddings",
            model_name: "text-embedding-3-large",
            dimensions: 3072,
            api_key_configured: false,
          },
        },
        local_models: {
          embedding: [],
          rerank: [],
        },
        recommended_profiles: [],
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

void test("saveRetrievalModelsProfile persists active retrieval settings", async () => {
  const originalFetch = globalThis.fetch;
  let seenMethod = "";
  let seenBody = "";

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    seenMethod = String(init?.method);
    seenBody = String(init?.body);
    return new Response(
      JSON.stringify({
        active_profile: {
          embedding: {
            provider: "openai_compatible",
            model_id: null,
            endpoint: "https://embed.example.com/v1/embeddings",
            model_name: "text-embedding-3-small",
            dimensions: 1536,
            api_key_configured: true,
          },
          reranker: {
            provider: "rerank_api",
            model_id: null,
            endpoint: "https://rerank.example.com/v1/rerank",
            model_name: "bge-reranker-base",
            api_key_configured: true,
          },
        },
        local_models: {
          embedding: [],
          rerank: [],
        },
        recommended_profiles: [],
        consumers: [],
        capability: {
          local_prepare_enabled: false,
          remote_config_enabled: true,
          test_enabled: true,
          rebuild_enabled: true,
          status_only: false,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const result = await saveRetrievalModelsProfile({
      embedding: {
        endpoint: "https://embed.example.com/v1/embeddings",
        api_key: "embed-secret",
        model_name: "text-embedding-3-small",
        dimensions: 1536,
      },
      reranker: {
        endpoint: "https://rerank.example.com/v1/rerank",
        api_key: "rerank-secret",
        model_name: "bge-reranker-base",
      },
    });

    assert.equal(seenMethod, "PUT");
    assert.match(seenBody, /text-embedding-3-small/);
    assert.equal(result.active_profile.reranker.model_name, "bge-reranker-base");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("testRetrievalEmbeddingProfile returns provider probe result", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ ok: true, vector_size: 3, message: "Embedding 测试通过。" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    const result = await testRetrievalEmbeddingProfile({
      endpoint: "https://embed.example.com/v1/embeddings",
      apiKey: "embed-secret",
      modelName: "text-embedding-3-small",
      probe_text: "hello retrieval",
    });
    assert.equal(result.vector_size, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("testRetrievalRerankerProfile returns reranker probe result", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        ok: true,
        top_document_index: 1,
        top_score: 0.92,
        message: "Reranker 测试通过。",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    const result = await testRetrievalRerankerProfile({
      endpoint: "https://rerank.example.com/v1/rerank",
      apiKey: "rerank-secret",
      modelName: "bge-reranker-base",
      query: "budget policy",
      documents: ["finance", "policy"],
    });
    assert.equal(result.top_document_index, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("rebuildRetrievalConsumerIndexes sends rebuild request", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        accepted: ["memory", "knowledge_base"],
        results: [
          {
            consumer_id: "memory",
            status: "rebuilt",
            record_count: 0,
          },
          {
            consumer_id: "knowledge_base",
            status: "not_supported",
            detail: "当前知识库仍使用词法检索和知识图谱，暂未接入向量索引重建。",
          },
        ],
        message: "已处理 2 个检索消费者的索引重建请求。",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    const result = await rebuildRetrievalConsumerIndexes(["memory", "knowledge_base"]);
    assert.deepEqual(result.accepted, ["memory", "knowledge_base"]);
    assert.equal(result.results[0]?.status, "rebuilt");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
