import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;

async function loadBridgeManagerFactory() {
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
    async (adapter, message) => {
      await adapter.send(message);
    },
    () => ({ dangerous: false }),
    (text) => ({ text, truncated: false }),
    DummyAdapter,
    DummyAdapter,
    DummyAdapter,
    DummyAdapter,
    DummyAdapter,
  );
}

function createStubAdapter(platform = "telegram") {
  const waiters = [];
  return {
    platform,
    running: false,
    consumeCount: 0,
    sent: [],
    queue: [],
    acks: [],
    validateConfig() {
      return null;
    },
    async start() {
      this.running = true;
    },
    async stop() {
      this.running = false;
      while (waiters.length > 0) {
        waiters.shift()(null);
      }
    },
    enqueue(message) {
      const waiter = waiters.shift();
      if (waiter) {
        waiter(message);
        return;
      }
      this.queue.push(message);
    },
    async consumeOne() {
      this.consumeCount += 1;
      const next = this.queue.shift();
      if (next) {
        return next;
      }
      if (!this.running) {
        return null;
      }
      return new Promise((resolve) => {
        waiters.push(resolve);
      });
    },
    async send(message) {
      this.sent.push(message);
    },
    acknowledgeUpdate(updateId) {
      this.acks.push(updateId);
    },
    getStatus() {
      return {
        platform: this.platform,
        running: this.running,
        connectedAt: null,
        error: null,
      };
    },
  };
}

async function waitFor(assertion, timeoutMs = 1_500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      assertion();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  assertion();
}

test("bridge manager background loop processes one inbound message and stops cleanly", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("telegram");
  const streamCalls = [];
  const manager = createBridgeManager({
    loadSettings: () => ({ settings: { remote_bridge_enabled: "true", bridge_telegram_verified: "true", bridge_telegram_bot_token: "token" } }),
    adapters: [adapter],
    listBindings: () => [],
    upsertBinding: (binding) => ({
      ...binding,
      id: "binding-1",
      createdAt: "",
      updatedAt: "",
    }),
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async streamMessage(threadId, text) {
        streamCalls.push({ threadId, text });
        return {
          threadId,
          finalText: "reply from thread",
          events: [],
        };
      },
    },
  });

  await manager.start();
  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-1",
    userId: "user-1",
    text: "hello",
    messageId: "msg-1",
    timestamp: Date.now(),
    updateId: 42,
  });

  await waitFor(() => {
    assert.equal(streamCalls.length, 1);
    assert.equal(adapter.sent.length, 1);
  });

  assert.deepEqual(streamCalls[0], {
    threadId: "thread-auto",
    text: "hello",
  });
  assert.deepEqual(adapter.sent[0], {
    platform: "telegram",
    chatId: "chat-1",
    text: "reply from thread",
    threadId: "thread-auto",
    replyToMessageId: "msg-1",
  });
  assert.deepEqual(adapter.acks, [42]);

  const consumeCountBeforeStop = adapter.consumeCount;
  await manager.stop();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(adapter.consumeCount, consumeCountBeforeStop);
});

test("bridge manager does not send adapter output when streamMessage returns empty final text", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("telegram");
  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-1",
    userId: "user-1",
    text: "hello",
    messageId: "msg-1",
    timestamp: Date.now(),
  });

  const manager = createBridgeManager({
    loadSettings: () => ({ settings: { remote_bridge_enabled: "true", bridge_telegram_verified: "true", bridge_telegram_bot_token: "token" } }),
    adapters: [adapter],
    listBindings: () => [],
    upsertBinding: (binding) => ({
      ...binding,
      id: "binding-1",
      createdAt: "",
      updatedAt: "",
    }),
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async streamMessage(threadId) {
        return {
          threadId,
          finalText: "",
          events: [],
        };
      },
    },
  });

  const handled = await manager.processNextInboundMessage();
  assert.equal(handled, true);
  assert.equal(adapter.sent.length, 0);
});

test("bridge manager refuses to start a platform that has not been verified", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("telegram");

  const manager = createBridgeManager({
    loadSettings: () => ({
      settings: {
        remote_bridge_enabled: "true",
        bridge_telegram_enabled: "true",
        bridge_telegram_verified: "",
      },
    }),
    adapters: [adapter],
  });

  const reason = await manager.startPlatform("telegram");
  assert.equal(reason, "channel_not_verified");
  assert.equal(adapter.running, false);
});

test("bridge manager streams Feishu replies through the card controller and finalizes success", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("feishu");
  const cardCalls = {
    create: [],
    update: [],
    finalize: [],
    updateToolCalls: [],
  };

  adapter.getCardStreamController = () => ({
    async create(chatId, initialText, replyToMessageId) {
      cardCalls.create.push({ chatId, initialText, replyToMessageId });
      return "card-1";
    },
    async update(messageId, text) {
      cardCalls.update.push({ messageId, text });
      return "ok";
    },
    updateToolCalls(messageId, tools) {
      cardCalls.updateToolCalls.push({ messageId, tools });
    },
    async finalize(messageId, finalText, status) {
      cardCalls.finalize.push({ messageId, finalText, status });
    },
  });

  adapter.enqueue({
    platform: "feishu",
    chatId: "chat-1",
    userId: "user-1",
    text: "hello",
    messageId: "msg-1",
    timestamp: Date.now(),
  });

  const manager = createBridgeManager({
    loadSettings: () => ({ settings: {} }),
    adapters: [adapter],
    listBindings: () => [],
    upsertBinding: (binding) => ({
      ...binding,
      id: "binding-1",
      createdAt: "",
      updatedAt: "",
    }),
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async streamMessage(threadId, _text, callbacks) {
        callbacks.onText("hello");
        callbacks.onText("hello world");
        return {
          threadId,
          finalText: "hello world",
          events: [],
        };
      },
    },
  });

  const handled = await manager.processNextInboundMessage();
  assert.equal(handled, true);
  assert.deepEqual(cardCalls.create, [
    {
      chatId: "chat-1",
      initialText: "hello",
      replyToMessageId: "msg-1",
    },
  ]);
  assert.deepEqual(cardCalls.update, [{ messageId: "card-1", text: "hello world" }]);
  assert.deepEqual(cardCalls.finalize, [
    {
      messageId: "card-1",
      finalText: "hello world",
      status: "completed",
    },
  ]);
  assert.equal(adapter.sent.length, 0);
});

test("bridge manager finalizes Feishu card streams as error when SSE processing fails", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("feishu");
  const finalizations = [];

  adapter.getCardStreamController = () => ({
    async create() {
      return "card-1";
    },
    async update() {
      return "ok";
    },
    async finalize(messageId, finalText, status) {
      finalizations.push({ messageId, finalText, status });
    },
  });

  adapter.enqueue({
    platform: "feishu",
    chatId: "chat-1",
    userId: "user-1",
    text: "hello",
    messageId: "msg-1",
    timestamp: Date.now(),
  });

  const manager = createBridgeManager({
    loadSettings: () => ({ settings: {} }),
    adapters: [adapter],
    listBindings: () => [],
    upsertBinding: (binding) => ({
      ...binding,
      id: "binding-1",
      createdAt: "",
      updatedAt: "",
    }),
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async streamMessage(_threadId, _text, callbacks) {
        callbacks.onText("partial");
        throw new Error("upstream unavailable");
      },
    },
  });

  const handled = await manager.processNextInboundMessage();
  assert.equal(handled, true);
  assert.deepEqual(finalizations, [
    {
      messageId: "card-1",
      finalText: "❌ Error: upstream unavailable",
      status: "error",
    },
  ]);
  assert.equal(adapter.sent.length, 0);
});

test("bridge manager forwards clarification tool messages when no final ai text is produced", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("telegram");
  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-clarify",
    userId: "user-1",
    text: "do something risky",
    messageId: "msg-clarify",
    timestamp: Date.now(),
  });

  const manager = createBridgeManager({
    loadSettings: () => ({ settings: {} }),
    adapters: [adapter],
    listBindings: () => [],
    upsertBinding: (binding) => ({
      ...binding,
      id: "binding-clarify",
      createdAt: "",
      updatedAt: "",
    }),
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async streamMessage(threadId) {
        return {
          threadId,
          finalText: "",
          events: [
            {
              event: "messages-tuple",
              data: {
                type: "tool",
                name: "ask_clarification",
                content: "⚠️ Please confirm before continuing.",
              },
            },
          ],
        };
      },
      async uploadFiles() {
        return {};
      },
    },
  });

  const handled = await manager.processNextInboundMessage();
  assert.equal(handled, true);
  assert.equal(adapter.sent.length, 1);
  assert.equal(adapter.sent[0].text, "⚠️ Please confirm before continuing.");
});

test("bridge manager adds Telegram inline buttons for short clarification options", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("telegram");
  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-option",
    userId: "user-1",
    text: "pick one",
    messageId: "msg-option",
    timestamp: Date.now(),
  });

  const manager = createBridgeManager({
    loadSettings: () => ({ settings: {} }),
    adapters: [adapter],
    listBindings: () => [],
    upsertBinding: (binding) => ({
      ...binding,
      id: "binding-option",
      createdAt: "",
      updatedAt: "",
    }),
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async streamMessage(threadId) {
        return {
          threadId,
          finalText: "",
          events: [
            {
              event: "messages-tuple",
              data: {
                type: "tool",
                name: "ask_clarification",
                content: "Pick one option.\n\n1. Alpha\n2. Beta",
              },
            },
            {
              event: "custom",
              data: {
                type: "clarification_request",
                question: "Pick one option.",
                options: ["Alpha", "Beta"],
              },
            },
          ],
        };
      },
      async uploadFiles() {
        return {};
      },
    },
  });

  const handled = await manager.processNextInboundMessage();
  assert.equal(handled, true);
  assert.equal(adapter.sent.length, 1);
  assert.deepEqual(adapter.sent[0].inlineButtons, [
    [
      { text: "Alpha", callbackData: "Alpha" },
      { text: "Beta", callbackData: "Beta" },
    ],
  ]);
});

test("bridge manager resolves permission callbacks and retries the original message", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("telegram");
  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-perm",
    userId: "user-1",
    text: "",
    callbackData: "perm:allow:perm-1",
    messageId: "callback-msg-1",
    timestamp: Date.now(),
    updateId: 99,
  });

  const streamCalls = [];
  const manager = createBridgeManager({
    loadSettings: () => ({ settings: {} }),
    adapters: [adapter],
    listBindings: () => [],
    upsertBinding: (binding) => ({
      ...binding,
      id: "binding-perm",
      createdAt: "",
      updatedAt: "",
    }),
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async resolvePermission(_threadId, permissionId, decision) {
        return {
          ok: true,
          decision,
          original_message_text: `retry:${permissionId}`,
        };
      },
      async streamMessage(threadId, text) {
        streamCalls.push({ threadId, text });
        return {
          threadId,
          finalText: "done",
          events: [],
        };
      },
      async uploadFiles() {
        return {};
      },
    },
  });

  const handled = await manager.processNextInboundMessage();
  assert.equal(handled, true);
  assert.equal(streamCalls.length, 1);
  assert.equal(streamCalls[0].text, "retry:perm-1");
  assert.equal(adapter.acks[0], 99);
});

test("bridge manager renders text permission commands for platforms without inline buttons", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("qq");
  adapter.enqueue({
    platform: "qq",
    chatId: "chat-perm-text",
    userId: "user-1",
    text: "run bash",
    messageId: "msg-perm-text",
    timestamp: Date.now(),
  });

  const manager = createBridgeManager({
    loadSettings: () => ({ settings: {} }),
    adapters: [adapter],
    listBindings: () => [],
    upsertBinding: (binding) => ({
      ...binding,
      id: "binding-perm-text",
      createdAt: "",
      updatedAt: "",
    }),
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async streamMessage(threadId) {
        return {
          threadId,
          finalText: "",
          events: [
            {
              event: "custom",
              data: {
                type: "permission_request",
                id: "perm-qq-1",
                tool_name: "bash",
                tool_input: { command: "rm -rf /tmp/test" },
                reason_message: "approval required",
                options: ["Allow", "Allow Session", "Deny"],
              },
            },
          ],
        };
      },
      async uploadFiles() {
        return {};
      },
    },
  });

  const handled = await manager.processNextInboundMessage();
  assert.equal(handled, true);
  assert.equal(adapter.sent.length, 1);
  assert.match(adapter.sent[0].text, /\/perm allow perm-qq-1/);
  assert.equal(adapter.sent[0].inlineButtons, undefined);
});

test("bridge manager /mode updates binding mode and applies it to the next stream", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("telegram");
  const bindings = [];
  const streamCalls = [];

  const upsertBinding = (binding) => {
    const existingIndex = bindings.findIndex(
      (item) => item.platform === binding.platform && item.chatId === binding.chatId,
    );
    const record = {
      ...binding,
      id: existingIndex >= 0 ? bindings[existingIndex].id : "binding-mode",
      createdAt: "",
      updatedAt: "",
    };
    if (existingIndex >= 0) {
      bindings[existingIndex] = record;
    } else {
      bindings.push(record);
    }
    return record;
  };

  const manager = createBridgeManager({
    loadSettings: () => ({
      settings: {
        remote_bridge_enabled: "true",
        bridge_default_work_dir: "/tmp/project",
        bridge_default_model: "sonnet",
      },
    }),
    adapters: [adapter],
    listBindings: () => bindings,
    upsertBinding,
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async streamMessage(threadId, text, _callbacks, options) {
        streamCalls.push({ threadId, text, options });
        return {
          threadId,
          finalText: "ok",
          events: [],
        };
      },
    },
  });

  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-mode",
    userId: "user-1",
    text: "/mode plan",
    messageId: "msg-mode",
    timestamp: Date.now(),
  });
  await manager.processNextInboundMessage();

  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-mode",
    userId: "user-1",
    text: "run this",
    messageId: "msg-run",
    timestamp: Date.now(),
  });
  await manager.processNextInboundMessage();

  assert.equal(bindings.length, 1);
  assert.equal(bindings[0].mode, "plan");
  assert.equal(streamCalls.length, 1);
  assert.equal(streamCalls[0].options.planMode, true);
  assert.equal(streamCalls[0].options.modelName, undefined);
});

test("bridge manager ignores bridge-specific default model configuration", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("telegram");
  const streamCalls = [];

  const manager = createBridgeManager({
    loadSettings: () => ({
      settings: {
        remote_bridge_enabled: "true",
        bridge_default_work_dir: "/tmp/project",
        bridge_default_provider_id: "anthropic-main",
        bridge_default_model: "sonnet",
      },
    }),
    adapters: [adapter],
    listBindings: () => [],
    upsertBinding: (binding) => ({
      ...binding,
      id: "binding-provider",
      createdAt: "",
      updatedAt: "",
    }),
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async streamMessage(threadId, text, _callbacks, options) {
        streamCalls.push({ threadId, text, options });
        return {
          threadId,
          finalText: "ok",
          events: [],
        };
      },
    },
  });

  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-provider",
    userId: "user-1",
    text: "run this",
    messageId: "msg-provider",
    timestamp: Date.now(),
  });

  await manager.processNextInboundMessage();

  assert.equal(streamCalls.length, 1);
  assert.equal(streamCalls[0].options.modelName, undefined);
});

test("bridge manager /stop aborts an in-flight task while the adapter loop keeps running", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("telegram");
  const bindings = [];
  let streamStarted = false;
  let aborted = false;

  const upsertBinding = (binding) => {
    const existingIndex = bindings.findIndex(
      (item) => item.platform === binding.platform && item.chatId === binding.chatId,
    );
    const record = {
      ...binding,
      id: existingIndex >= 0 ? bindings[existingIndex].id : "binding-stop",
      createdAt: "",
      updatedAt: "",
    };
    if (existingIndex >= 0) {
      bindings[existingIndex] = record;
    } else {
      bindings.push(record);
    }
    return record;
  };

  const manager = createBridgeManager({
    loadSettings: () => ({
      settings: {
        remote_bridge_enabled: "true",
        bridge_default_work_dir: "/tmp/project",
        bridge_telegram_verified: "true",
        bridge_telegram_bot_token: "token",
      },
    }),
    adapters: [adapter],
    listBindings: () => bindings,
    upsertBinding,
    defaultWorkingDirectory: () => "/tmp/project",
    threadClient: {
      async streamMessage(threadId, _text, _callbacks, options) {
        streamStarted = true;
        return await new Promise((resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            aborted = true;
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      },
    },
  });

  await manager.start();

  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-stop",
    userId: "user-1",
    text: "long running task",
    messageId: "msg-long",
    timestamp: Date.now(),
  });

  await waitFor(() => {
    assert.equal(streamStarted, true);
  });

  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-stop",
    userId: "user-1",
    text: "/stop",
    messageId: "msg-stop",
    timestamp: Date.now(),
  });

  await waitFor(() => {
    assert.equal(aborted, true);
    assert.ok(adapter.sent.some((message) => /Stopping current task/.test(message.text)));
    assert.ok(adapter.sent.some((message) => /Task interrupted/.test(message.text)));
  });

  await manager.stop();
});
