import assert from "node:assert/strict";
import test from "node:test";

void test("memory os api loads provider families and state", async () => {
  const requests: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requests.push(String(input));

    if (requests.length === 1) {
      return new Response(JSON.stringify({ families: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        active_provider_family: "builtin",
        active_provider_id: null,
        providers: [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const { getMemoryProviderState, listMemoryProviderFamilies } = await import(
      new URL("./api.ts", import.meta.url).href
    );

    await listMemoryProviderFamilies();
    await getMemoryProviderState();

    assert.equal(
      requests[0]?.includes("/api/memory-os/providers/families"),
      true,
    );
    assert.equal(
      requests[1]?.includes("/api/memory-os/providers/state"),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
