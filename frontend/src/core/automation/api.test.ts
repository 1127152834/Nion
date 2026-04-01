import assert from "node:assert/strict";
import test from "node:test";

const { loadAutomationStatus } = await import(
  new URL("./api.ts", import.meta.url).href
);

void test("automation api falls back from desktop helper port to gateway when fetch fails", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;

  const seenUrls: string[] = [];

  globalThis.window = {
    location: {
      protocol: "http:",
      hostname: "127.0.0.1",
    },
    nionDesktop: {},
  } as never;

  globalThis.fetch = async (input) => {
    const url = String(input);
    seenUrls.push(url);
    if (url.startsWith("http://127.0.0.1:43115/")) {
      throw new TypeError("Failed to fetch");
    }
    return new Response(
      JSON.stringify({
        scheduler_running: true,
        total_jobs_count: 0,
        active_jobs_count: 0,
        paused_jobs_count: 0,
        error_jobs_count: 0,
        run_count: 0,
        failed_runs_count: 0,
        last_tick_at: null,
        last_success_at: null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  try {
    const result = await loadAutomationStatus();
    assert.equal(result.scheduler_running, true);
    assert.ok(
      seenUrls.length === 1 || seenUrls.length === 2,
      `unexpected request sequence: ${JSON.stringify(seenUrls)}`,
    );
    assert.equal(seenUrls.at(-1), "http://localhost:8001/api/automation/status");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});
