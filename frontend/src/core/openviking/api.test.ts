import assert from "node:assert/strict";
import test from "node:test";

const { reindexNotebookResources, searchNotebookResources } = await import(
  new URL("./api.ts", import.meta.url).href
);

function createJsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

void test("openviking notebook api hits reindex and search endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];

  globalThis.fetch = async (input, init) => {
    urls.push(`${init?.method ?? "GET"} ${String(input)}`);
    return createJsonResponse({ items: [], notes_indexed: 0 });
  };

  try {
    await reindexNotebookResources();
    await searchNotebookResources("alpha", 3);
    assert.deepEqual(urls, [
      "POST /api/openviking/notebook/reindex",
      "GET /api/openviking/notebook/search?query=alpha&limit=3",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
