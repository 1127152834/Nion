import assert from "node:assert/strict";
import test from "node:test";

const { loadMemory } = await import(new URL("./api.ts", import.meta.url).href);

function createJsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

void test("loadMemory rejects non-ok responses instead of treating them as memory data", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    createJsonResponse({ detail: "Not Found" }, { status: 404 });

  try {
    await assert.rejects(loadMemory(), /404/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("loadMemory rejects malformed successful responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    createJsonResponse({ version: "1.0", lastUpdated: "2026-03-25T00:00:00Z" });

  try {
    await assert.rejects(loadMemory(), /Invalid memory payload/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("loadMemory returns valid memory payloads", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    createJsonResponse({
      version: "1.0",
      lastUpdated: "2026-03-25T00:00:00Z",
      user: {
        workContext: { summary: "", updatedAt: "" },
        personalContext: { summary: "", updatedAt: "" },
        topOfMind: { summary: "", updatedAt: "" },
      },
      history: {
        recentMonths: { summary: "", updatedAt: "" },
        earlierContext: { summary: "", updatedAt: "" },
        longTermBackground: { summary: "", updatedAt: "" },
      },
      facts: [],
    });

  try {
    const result = await loadMemory();

    assert.equal(result.user.workContext.summary, "");
    assert.deepEqual(result.facts, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
