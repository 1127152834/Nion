import assert from "node:assert/strict";
import test from "node:test";

const {
  clearMemory,
  createMemoryFact,
  deleteMemoryFact,
  exportMemory,
  importMemory,
  loadMemory,
  updateMemoryFact,
} = await import(
  new URL("./api.ts", import.meta.url).href,
);

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

void test("clearMemory uses DELETE /api/memory and returns valid memory payloads", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/api\/memory$/);
    assert.equal(init?.method, "DELETE");

    return createJsonResponse({
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
  };

  try {
    const result = await clearMemory();
    assert.deepEqual(result.facts, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("deleteMemoryFact encodes fact ids and uses DELETE fact endpoint", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/api\/memory\/facts\/fact%20with%20space$/);
    assert.equal(init?.method, "DELETE");

    return createJsonResponse({
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
      facts: [
        {
          id: "fact_keep",
          content: "keep",
          category: "context",
          confidence: 0.8,
          createdAt: "",
          source: "",
        },
      ],
    });
  };

  try {
    const result = await deleteMemoryFact("fact with space");
    assert.equal(result.facts[0]?.id, "fact_keep");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("createMemoryFact posts to /api/memory/facts", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/api\/memory\/facts$/);
    assert.equal(init?.method, "POST");
    assert.match(String(init?.body), /structured memory/);

    return createJsonResponse({
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
      facts: [
        {
          id: "fact_new",
          content: "structured memory",
          category: "context",
          confidence: 0.9,
          createdAt: "",
          source: "manual",
        },
      ],
    });
  };

  try {
    const result = await createMemoryFact({
      content: "structured memory",
      category: "context",
      confidence: 0.9,
    });
    assert.equal(result.facts[0]?.id, "fact_new");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("updateMemoryFact patches /api/memory/facts/:id", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/api\/memory\/facts\/fact_edit$/);
    assert.equal(init?.method, "PATCH");
    assert.match(String(init?.body), /updated/);

    return createJsonResponse({
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
      facts: [
        {
          id: "fact_edit",
          content: "updated",
          category: "context",
          confidence: 0.8,
          createdAt: "",
          source: "manual",
        },
      ],
    });
  };

  try {
    const result = await updateMemoryFact("fact_edit", { content: "updated" });
    assert.equal(result.facts[0]?.content, "updated");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("exportMemory uses GET /api/memory/export", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    assert.match(String(input), /\/api\/memory\/export$/);
    return createJsonResponse({
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
  };

  try {
    const result = await exportMemory();
    assert.equal(result.version, "1.0");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("importMemory posts full payload to /api/memory/import", async () => {
  const originalFetch = globalThis.fetch;
  const payload = {
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
  };

  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /\/api\/memory\/import$/);
    assert.equal(init?.method, "POST");
    assert.match(String(init?.body), /\"version\":\"1.0\"/);
    return createJsonResponse(payload);
  };

  try {
    const result = await importMemory(payload);
    assert.equal(result.version, "1.0");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
