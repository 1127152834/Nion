import assert from "node:assert/strict";
import test from "node:test";

const { runAutoDream } = await import(new URL("./api.ts", import.meta.url).href);

void test("autodream api hits manual run endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seen = "";

  globalThis.fetch = async (input, init) => {
    seen = `${init?.method ?? "GET"} ${String(input)}`;
    return new Response(JSON.stringify({ entry: {}, entry_path: "/tmp/dream.md" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await runAutoDream({ query: "onboarding quality" });
    assert.equal(seen, "POST /api/autodream/run");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
