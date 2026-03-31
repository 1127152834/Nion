import assert from "node:assert/strict";
import test from "node:test";

const { loadSelfMaintenanceLogs } = await import(
  new URL("./api.ts", import.meta.url).href,
);

void test("self-maintenance api hits primary maintenance endpoint", async () => {
  let seen = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen = `${init?.method ?? "GET"} ${String(input)}`;
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  }) as typeof fetch;

  try {
    await loadSelfMaintenanceLogs();
    assert.match(seen, /GET .*\/api\/self-maintenance\/logs/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
