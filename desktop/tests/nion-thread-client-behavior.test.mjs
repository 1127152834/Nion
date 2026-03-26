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
