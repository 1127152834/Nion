import assert from "node:assert/strict";
import test from "node:test";

const { loadAutomationPlatformCapabilities } = await import(
  new URL("./api.ts", import.meta.url).href,
);

function createJsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

void test("loadAutomationPlatformCapabilities calls platform capabilities endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({
      webhook_event_versions: ["1"],
      plugin_actions: ["echo.plugin"],
    });
  };

  try {
    const result = await loadAutomationPlatformCapabilities();
    assert.match(seenUrl, /\/api\/automation\/platform\/capabilities$/);
    assert.equal(result.plugin_actions[0], "echo.plugin");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
