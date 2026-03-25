import assert from "node:assert/strict";
import test from "node:test";

const { deleteProviderModel, loadProviderTemplates } = await import(
  new URL("./api.ts", import.meta.url).href,
);

function createJsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

void test("loadProviderTemplates builds the category query", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({ templates: [] });
  };

  try {
    await loadProviderTemplates({ category: "domestic" });

    assert.match(
      seenUrl,
      /\/api\/model-admin\/templates\?category=domestic$/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("deleteProviderModel accepts 204 responses", async () => {
  const originalFetch = globalThis.fetch;
  let seenMethod = "";

  globalThis.fetch = async (_input, init) => {
    seenMethod = init?.method ?? "";
    return new Response(null, { status: 204 });
  };

  try {
    const result = await deleteProviderModel("model-123");

    assert.equal(seenMethod, "DELETE");
    assert.equal(result, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
