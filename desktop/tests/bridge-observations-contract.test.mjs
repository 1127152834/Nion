import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;

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

function createStubAdapter(platform = "telegram") {
  const waiters = [];
  return {
    platform,
    running: false,
    queue: [],
    consumeError: null,
    consumeErrorCount: 0,
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
      if (this.consumeError && this.consumeErrorCount > 0) {
        this.consumeErrorCount -= 1;
        throw this.consumeError;
      }
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
    async send() {},
    getStatus() {
      return {
        platform: this.platform,
        running: this.running,
        connectedAt: this.running ? "2026-03-26T00:00:00.000Z" : null,
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

test("bridge manager records manager start and stop observations", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const adapter = createStubAdapter("telegram");
  const observations = [];
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
    recordObservation: (observation) => {
      observations.push(observation);
    },
  });

  await manager.start();
  await manager.stop();

  assert.ok(
    observations.some((item) => item.observationType === "bridge_manager_started"),
  );
  assert.ok(
    observations.some((item) => item.observationType === "bridge_manager_stopped"),
  );
});

test("bridge manager records adapter start failures", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const observations = [];
  const adapter = {
    ...createStubAdapter("feishu"),
    async start() {
      throw new Error("invalid credentials");
    },
  };

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
    recordObservation: (observation) => {
      observations.push(observation);
    },
  });

  await manager.start();

  assert.ok(
    observations.some(
      (item) =>
        item.observationType === "adapter_start_failed"
        && item.adapterPlatform === "feishu",
    ),
  );
});

test("bridge manager records adapter runtime failures from the background loop", async () => {
  const createBridgeManager = await loadBridgeManagerFactory();
  const observations = [];
  const adapter = createStubAdapter("discord");
  adapter.consumeError = new Error("gateway lost");
  adapter.consumeErrorCount = 1;

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
    recordObservation: (observation) => {
      observations.push(observation);
    },
  });

  await manager.start();
  await waitFor(() => {
    assert.ok(
      observations.some(
        (item) =>
          item.observationType === "adapter_runtime_error"
          && item.adapterPlatform === "discord",
      ),
    );
  });
  await manager.stop();
});

test("bridge manager records delivery failures through the observation recorder", async () => {
  let attempts = 0;
  const createBridgeManager = await loadBridgeManagerFactory(async (_adapter, _message, options) => {
    attempts += 1;
    if (attempts === 1) {
      options?.recordObservation?.({
        observationType: "bridge_delivery_failed",
        level: "error",
        adapterPlatform: "telegram",
        bindingId: options?.bindingId ?? null,
        threadId: options?.threadId ?? null,
        summary: "Bridge delivery failed for telegram",
        details: { error: "send failed" },
      });
      throw new Error("send failed");
    }
  });
  const observations = [];
  const adapter = createStubAdapter("telegram");
  adapter.enqueue({
    platform: "telegram",
    chatId: "chat-delivery",
    userId: "user-1",
    text: "hello",
    messageId: "msg-delivery",
    timestamp: Date.now(),
  });

  const manager = createBridgeManager({
    loadSettings: () => ({ settings: {} }),
    adapters: [adapter],
    listBindings: () => [],
    upsertBinding: (binding) => ({
      ...binding,
      id: "binding-delivery",
      createdAt: "",
      updatedAt: "",
    }),
    defaultWorkingDirectory: () => "/tmp/project",
    recordObservation: (observation) => {
      observations.push(observation);
    },
    threadClient: {
      async streamMessage(threadId) {
        return {
          threadId,
          finalText: "reply from thread",
          events: [],
        };
      },
    },
  });

  const handled = await manager.processNextInboundMessage();
  assert.equal(handled, true);
  assert.ok(
    observations.some(
      (item) =>
        item.observationType === "bridge_delivery_failed"
        && item.adapterPlatform === "telegram",
    ),
  );
});
