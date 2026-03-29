import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { createDesktopThreadClient } from "../api/desktop-client.ts";

void test("shared thread model files avoid explicit any", async () => {
  const files = [
    new URL("./types.ts", import.meta.url),
    new URL("../api/desktop-client.ts", import.meta.url),
    new URL("../../../next-shims.d.ts", import.meta.url),
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\bany\b/);
  }
});

void test("desktop thread client exposes search/getState/update/delete/stream/resolvePermission", () => {
  const client = createDesktopThreadClient({
    getBaseURL: () => "http://127.0.0.1:43115/api/threads",
  });
  assert.equal(typeof client.search, "function");
  assert.equal(typeof client.getState, "function");
  assert.equal(typeof client.updateState, "function");
  assert.equal(typeof client.deleteThread, "function");
  assert.equal(typeof client.streamRun, "function");
  assert.equal(typeof client.resolvePermission, "function");
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

  assert.deepEqual(seen.find((entry) => entry.event === "custom"), {
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

void test("desktop thread client resolves permission through thread-level permission route", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        ok: true,
        consumed: true,
        original_message_text: "帮我安装 stripe CLI",
        replay_payload: {
          text: "帮我安装 stripe CLI",
          files: [
            {
              filename: "notes.txt",
              path: "/mnt/user-data/uploads/notes.txt",
              size: 12,
              status: "uploaded",
            },
          ],
          additional_kwargs: {
            shortcut_selections: {
              cliTools: ["stripe"],
            },
          },
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  };

  const client = createDesktopThreadClient({
    getBaseURL: () => "http://127.0.0.1:43115/api/threads",
  });

  const result = await client.resolvePermission("t-1", "perm-1", "allow");

  assert.match(requestedUrl, /\/api\/threads\/t-1\/permissions\/perm-1\/resolve$/);
  assert.deepEqual(result, {
    ok: true,
    consumed: true,
    original_message_text: "帮我安装 stripe CLI",
    replay_payload: {
      text: "帮我安装 stripe CLI",
      files: [
        {
          filename: "notes.txt",
          path: "/mnt/user-data/uploads/notes.txt",
          size: 12,
          status: "uploaded",
        },
      ],
      additional_kwargs: {
        shortcut_selections: {
          cliTools: ["stripe"],
        },
      },
    },
  });

  globalThis.fetch = originalFetch;
});
