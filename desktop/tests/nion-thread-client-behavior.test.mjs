import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;

async function loadThreadClientFactory() {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/nion-thread-client.ts", import.meta.url),
    "utf8",
  );
  const stripped = stripTypeScriptTypes(
    source.replace(
      /export function createNionThreadClient/,
      "function createNionThreadClient",
    ),
  );
  return new Function(`${stripped}\nreturn createNionThreadClient;`)();
}

test("nion thread client streamMessage returns final ai text from SSE", async () => {
  const createNionThreadClient = await loadThreadClientFactory();
  const originalFetch = globalThis.fetch;

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
                'event: messages-tuple',
                'data: {"type":"ai","content":"hello"}',
                "",
                'event: messages-tuple',
                'data: {"type":"ai","content":"hello world"}',
                "",
                'event: end',
                'data: {}',
                "",
              ].join("\n"),
            ),
          );
          controller.close();
        },
      }),
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    );

  const client = createNionThreadClient("http://127.0.0.1:43115");
  const result = await client.streamMessage("t-1", "hi");

  assert.equal(result.threadId, "t-1");
  assert.equal(result.finalText, "hello world");

  globalThis.fetch = originalFetch;
});

test("nion thread client forwards incremental ai text updates to onText", async () => {
  const createNionThreadClient = await loadThreadClientFactory();
  const originalFetch = globalThis.fetch;
  const seenTexts = [];

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
                'event: messages-tuple',
                'data: {"type":"ai","id":"ai-1","content":"Hel"}',
                "",
                'event: messages-tuple',
                'data: {"type":"ai","id":"ai-1","content":"Hello"}',
                "",
                'event: messages-tuple',
                'data: {"type":"ai","id":"ai-1","content":"Hello world"}',
                "",
                'event: end',
                'data: {}',
                "",
              ].join("\n"),
            ),
          );
          controller.close();
        },
      }),
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    );

  const client = createNionThreadClient("http://127.0.0.1:43115");
  const result = await client.streamMessage("t-1", "hi", {
    onText: (text) => {
      seenTexts.push(text);
    },
  });

  assert.deepEqual(seenTexts, ["Hel", "Hello", "Hello world"]);
  assert.equal(result.finalText, "Hello world");

  globalThis.fetch = originalFetch;
});

test("nion thread client streamMessage surfaces SSE error events", async () => {
  const createNionThreadClient = await loadThreadClientFactory();
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
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    );

  const client = createNionThreadClient("http://127.0.0.1:43115");
  await assert.rejects(() => client.streamMessage("t-1", "hi"), /upstream unavailable/);

  globalThis.fetch = originalFetch;
});

test("nion thread client handles split end event without losing final text", async () => {
  const createNionThreadClient = await loadThreadClientFactory();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(
              'event: messages-tuple\ndata: {"type":"ai","content":"done"}\n\n',
            ),
          );
          controller.enqueue(encoder.encode("event: en"));
          controller.enqueue(encoder.encode("d\ndata: {}"));
          controller.enqueue(encoder.encode("\n\n"));
          controller.close();
        },
      }),
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    );

  const client = createNionThreadClient("http://127.0.0.1:43115");
  const result = await client.streamMessage("t-1", "hi");

  assert.equal(result.finalText, "done");
  assert.ok(result.events.some((event) => event.event === "end"));

  globalThis.fetch = originalFetch;
});

test("nion thread client forwards client id on bridge permission resolve", async () => {
  const createNionThreadClient = await loadThreadClientFactory();
  const originalFetch = globalThis.fetch;
  let capturedHeaders;

  globalThis.fetch = async (_input, init) => {
    capturedHeaders = init?.headers;
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = createNionThreadClient("http://127.0.0.1:43115", {
    clientId: "desktop-client-1",
  });
  await client.resolvePermission("t-1", "perm-1", "allow");

  const headers = new Headers(capturedHeaders);
  assert.equal(headers.get("X-Nion-Client-Id"), "desktop-client-1");

  globalThis.fetch = originalFetch;
});

test("nion thread client exposes local-actions metadata from bridge permission resolve", async () => {
  const createNionThreadClient = await loadThreadClientFactory();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        decision: "allow",
        tool_name: "local_actions_review",
        local_actions: {
          execution_id: "exec-1",
          plan_id: "plan-1",
          actions: [
            { action_type: "capture_active_window", target: "active_window" },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const client = createNionThreadClient("http://127.0.0.1:43115", {
    clientId: "desktop-client-1",
  });
  const result = await client.resolvePermission("t-1", "perm-1", "allow");

  assert.equal(result.tool_name, "local_actions_review");
  assert.equal(result.local_actions?.execution_id, "exec-1");
  assert.equal(result.local_actions?.actions?.[0]?.action_type, "capture_active_window");

  globalThis.fetch = originalFetch;
});
