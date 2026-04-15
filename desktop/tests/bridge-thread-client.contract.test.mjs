import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;

async function loadThreadClientFactory() {
  const source = await readFile(
    new URL("../src/main/bridge/nion-thread-client.ts", import.meta.url),
    "utf8",
  );

  const transformed = stripTypeScriptTypes(source.replace(/^export\s+/gm, ""));

  return new Function(
    "fetch",
    "Response",
    "FormData",
    "Blob",
    "Buffer",
    "TextDecoderStream",
    `${transformed}\nreturn { createNionThreadClient };`,
  );
}

async function loadBridgeManagerFactory(deliverImpl = async () => {}) {
  const source = await readFile(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  const transformed = stripTypeScriptTypes(
    source
      .replace(/^import[\s\S]*?;\n/gm, "")
      .replace(/export function createBridgeManager/, "function createBridgeManager"),
  );

  const createBridgeChannelRouter = ({ listBindings, upsertBinding, defaultWorkingDirectory }) => ({
    resolveBinding: (address) => {
      const existing = listBindings().find(
        (binding) => binding.platform === address.platform && binding.chatId === address.chatId,
      );
      if (existing) {
        return existing;
      }
      return upsertBinding({
        platform: address.platform,
        chatId: address.chatId,
        threadId: "thread-auto",
        workingDirectory: defaultWorkingDirectory(),
        active: true,
      });
    },
  });

  class DummyAdapter {}

  return new Function(
    "createBridgeChannelRouter",
    "createNionThreadClient",
    "deliverBridgeMessage",
    "isDangerousInput",
    "sanitizeInput",
    "TelegramBridgeAdapter",
    "FeishuBridgeAdapter",
    "DiscordBridgeAdapter",
    "QqBridgeAdapter",
    "WeixinBridgeAdapter",
    `${transformed}\nreturn createBridgeManager;`,
  )(
    createBridgeChannelRouter,
    () => ({}),
    deliverImpl,
    () => ({ dangerous: false }),
    (text) => ({ text, truncated: false }),
    DummyAdapter,
    DummyAdapter,
    DummyAdapter,
    DummyAdapter,
    DummyAdapter,
  );
}

function createStubAdapter(inbound) {
  let nextInbound = inbound;
  return {
    platform: inbound.platform,
    validateConfig() {
      return null;
    },
    async start() {},
    async stop() {},
    async consumeOne() {
      const current = nextInbound;
      nextInbound = null;
      return current;
    },
    async send() {},
    getStatus() {
      return {
        platform: inbound.platform,
        running: false,
        connectedAt: null,
        error: null,
      };
    },
  };
}

test("bridge thread client includes execution mode and host workdir in stream context", async () => {
  let requestBody = null;
  const loadFactory = await loadThreadClientFactory();
  const createFactory = loadFactory(
    async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return new Response('event: created\ndata: {"thread_id":"thread-1"}\n\n');
    },
    Response,
    FormData,
    Blob,
    Buffer,
    TextDecoderStream,
  );

  const client = createFactory.createNionThreadClient("http://127.0.0.1:43115");
  await client.streamMessage("thread-1", "hello", undefined, {
    executionMode: "host",
    hostWorkdir: "/tmp/project",
  });

  assert.equal(requestBody.context.surface, "bridge");
  assert.equal(requestBody.context.execution_mode, "host");
  assert.equal(requestBody.context.host_workdir, "/tmp/project");
  assert.equal(requestBody.context.is_plan_mode, false);
});

test("bridge manager passes binding workdir into thread stream options", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const cases = [
    {
      binding: {
        id: "binding-host",
        platform: "telegram",
        chatId: "chat-host",
        threadId: "thread-host",
        workingDirectory: "/tmp/project",
        model: "gpt-5.4",
        mode: "code",
        active: true,
        createdAt: "",
        updatedAt: "",
      },
      expected: {
        executionMode: "host",
        hostWorkdir: "/tmp/project",
      },
      defaultWorkingDirectory: "/tmp/default",
    },
    {
      binding: {
        id: "binding-sandbox",
        platform: "telegram",
        chatId: "chat-sandbox",
        threadId: "thread-sandbox",
        workingDirectory: "",
        model: "gpt-5.4",
        mode: "code",
        active: true,
        createdAt: "",
        updatedAt: "",
      },
      expected: {
        executionMode: "sandbox",
        hostWorkdir: null,
      },
      defaultWorkingDirectory: "",
    },
  ];

  for (const testCase of cases) {
    let capturedOptions = null;
    const adapter = createStubAdapter({
      platform: "telegram",
      chatId: testCase.binding.chatId,
      userId: "user-1",
      text: "hello",
      messageId: "msg-1",
      timestamp: Date.now(),
    });

    const manager = createBridgeManager({
      loadSettings: () => ({ settings: {} }),
      adapters: [adapter],
      listBindings: () => [testCase.binding],
      upsertBinding: (binding) => ({
        ...testCase.binding,
        ...binding,
      }),
      defaultWorkingDirectory: () => testCase.defaultWorkingDirectory,
      threadClient: {
        async ensureThreadState() {},
        async streamMessage(_threadId, _text, _callbacks, options) {
          capturedOptions = options;
          return {
            threadId: testCase.binding.threadId,
            finalText: "reply",
            events: [],
          };
        },
      },
    });

    const handled = await manager.processNextInboundMessage();
    assert.equal(handled, true);
    assert.equal(capturedOptions.executionMode, testCase.expected.executionMode);
    assert.equal(capturedOptions.hostWorkdir, testCase.expected.hostWorkdir);
  }
});
