import assert from "node:assert/strict";
import test from "node:test";

const { loadAutomationEvents, replayAutomationEvent } = await import(
  new URL("./api.ts", import.meta.url).href,
);

function createJsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

void test("loadAutomationEvents builds category and event_type query params", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({ events: [] });
  };

  try {
    await loadAutomationEvents({
      category: "agent",
      eventType: "agent_run_failed",
    });

    assert.match(
      seenUrl,
      /\/api\/automation\/events\?category=agent&event_type=agent_run_failed$/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("replayAutomationEvent posts the replay payload", async () => {
  const originalFetch = globalThis.fetch;
  let seenBody = "";
  let seenMethod = "";

  globalThis.fetch = async (_input, init) => {
    seenMethod = init?.method ?? "";
    seenBody = String(init?.body ?? "");
    return createJsonResponse({ ok: true });
  };

  try {
    const result = await replayAutomationEvent("thread.finished", {
      thread_id: "thread-1",
    });

    assert.equal(seenMethod, "POST");
    assert.match(seenBody, /"event_name":"thread\.finished"/);
    assert.match(seenBody, /"thread_id":"thread-1"/);
    assert.equal(result.ok, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
