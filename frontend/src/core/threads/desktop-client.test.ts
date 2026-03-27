import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { createDesktopThreadClient } from "../api/desktop-client.ts";

void test("shared thread model files avoid explicit any", async () => {
  const files = [
    new URL("../types.ts", import.meta.url),
    new URL("../api/desktop-client.ts", import.meta.url),
    new URL("../../../next-shims.d.ts", import.meta.url),
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\bany\b/);
  }
});

void test("desktop thread client exposes search/getState/update/delete/stream", () => {
  const client = createDesktopThreadClient({
    getBaseURL: () => "http://127.0.0.1:43115/api/threads",
  });
  assert.equal(typeof client.search, "function");
  assert.equal(typeof client.getState, "function");
  assert.equal(typeof client.updateState, "function");
  assert.equal(typeof client.deleteThread, "function");
  assert.equal(typeof client.streamRun, "function");
});

void test("desktop thread client forwards custom SSE events to handlers", async () => {
  const originalFetch = globalThis.fetch;
  const seen: Array<{ event: string; data: Record<string, unknown> }> = [];

  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              [
                'event: created',
                'data: {"thread_id":"t-1"}',
                "",
                'event: custom',
                'data: {"type":"clarification_request","question":"Continue?"}',
                "",
              ].join("\n"),
            ),
          );
          controller.close();
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
        },
      },
    );

  const client = createDesktopThreadClient({
    getBaseURL: () => "http://127.0.0.1:43115/api/threads",
  });

  await client.streamRun(
    "t-1",
    { messages: [] },
    { threadId: "t-1", context: {}, config: {} },
    {
      onEvent: (event, data) => {
        seen.push({ event, data });
      },
    },
  );

  assert.deepEqual(seen.at(-1), {
    event: "custom",
    data: {
      type: "clarification_request",
      question: "Continue?",
    },
  });

  globalThis.fetch = originalFetch;
});

void test("desktop thread client surfaces SSE error events", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'event: error\ndata: {"message":"upstream unavailable"}\n\n',
            ),
          );
          controller.close();
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
        },
      },
    );

  const client = createDesktopThreadClient({
    getBaseURL: () => "http://127.0.0.1:43115/api/threads",
  });

  await assert.rejects(
    () =>
      client.streamRun(
        "new",
        { messages: [] },
        { threadId: "new", context: {}, config: {} },
      ),
    /upstream unavailable/,
  );

  globalThis.fetch = originalFetch;
});
