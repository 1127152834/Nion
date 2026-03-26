import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;

async function loadDiscordAdapterClass() {
  const source = await readFile(
    new URL("../src/main/bridge/adapters/discord-adapter.ts", import.meta.url),
    "utf8",
  );
  const transformed = stripTypeScriptTypes(
    source
      .replace(/^import[\s\S]*?;\n/gm, "")
      .replace(/export class DiscordBridgeAdapter/, "class DiscordBridgeAdapter"),
  );

  class BaseBridgeAdapter {}

  return new Function(
    "BaseBridgeAdapter",
    `${transformed}\nreturn DiscordBridgeAdapter;`,
  )(BaseBridgeAdapter);
}

class MockWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 1;
    this.listeners = new Map();
    this.sent = [];
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.emit("message", {
        data: JSON.stringify({
          op: 10,
          d: { heartbeat_interval: 1000 },
        }),
      });
      this.emit("message", {
        data: JSON.stringify({
          op: 0,
          t: "READY",
          s: 1,
          d: {
            session_id: "session-1",
            user: { id: "bot-1" },
          },
        }),
      });
    });
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  send(payload) {
    this.sent.push(payload);
  }

  close(code = 1000, reason = "") {
    this.readyState = 3;
    this.emit("close", { code, reason });
  }

  emit(type, event) {
    for (const listener of this.listeners.get(type) || []) {
      listener(event);
    }
  }
}

test("discord adapter consumes direct messages from gateway events", async () => {
  const DiscordBridgeAdapter = await loadDiscordAdapterClass();
  const originalFetch = globalThis.fetch;
  const originalWebSocket = globalThis.WebSocket;

  globalThis.fetch = async (url) => {
    if (String(url).includes("/gateway/bot")) {
      return new Response(JSON.stringify({ url: "wss://gateway.discord.gg" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  };
  globalThis.WebSocket = MockWebSocket;

  const adapter = new DiscordBridgeAdapter({
    bridge_discord_enabled: "true",
    bridge_discord_bot_token: "discord-token",
  });
  await adapter.start();

  const socket = MockWebSocket.instances.at(-1);
  socket.emit("message", {
    data: JSON.stringify({
      op: 0,
      t: "MESSAGE_CREATE",
      s: 2,
      d: {
        id: "msg-1",
        channel_id: "dm-1",
        content: "hello from dm",
        timestamp: "2026-03-26T10:00:00.000Z",
        author: { id: "user-1", username: "alice", bot: false },
        mentions: [],
      },
    }),
  });

  const inbound = await adapter.consumeOne();
  assert.deepEqual(inbound, {
    platform: "discord",
    chatId: "dm-1",
    userId: "user-1",
    text: "hello from dm",
    messageId: "msg-1",
    timestamp: new Date("2026-03-26T10:00:00.000Z").getTime(),
  });

  await adapter.stop();
  globalThis.fetch = originalFetch;
  globalThis.WebSocket = originalWebSocket;
});

test("discord adapter ignores guild messages unless the bot is mentioned", async () => {
  const DiscordBridgeAdapter = await loadDiscordAdapterClass();
  const originalFetch = globalThis.fetch;
  const originalWebSocket = globalThis.WebSocket;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ url: "wss://gateway.discord.gg" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  globalThis.WebSocket = MockWebSocket;

  const adapter = new DiscordBridgeAdapter({
    bridge_discord_enabled: "true",
    bridge_discord_bot_token: "discord-token",
  });
  await adapter.start();

  const socket = MockWebSocket.instances.at(-1);
  socket.emit("message", {
    data: JSON.stringify({
      op: 0,
      t: "MESSAGE_CREATE",
      s: 3,
      d: {
        id: "msg-2",
        channel_id: "guild-channel-1",
        guild_id: "guild-1",
        content: "plain guild message",
        timestamp: "2026-03-26T10:01:00.000Z",
        author: { id: "user-2", username: "bob", bot: false },
        mentions: [],
      },
    }),
  });

  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(adapter.inbox.length, 0);

  socket.emit("message", {
    data: JSON.stringify({
      op: 0,
      t: "MESSAGE_CREATE",
      s: 4,
      d: {
        id: "msg-3",
        channel_id: "guild-channel-1",
        guild_id: "guild-1",
        content: "<@bot-1> hello guild",
        timestamp: "2026-03-26T10:02:00.000Z",
        author: { id: "user-2", username: "bob", bot: false },
        mentions: [{ id: "bot-1" }],
      },
    }),
  });

  const inbound = await adapter.consumeOne();
  assert.equal(inbound.text, "hello guild");

  await adapter.stop();
  globalThis.fetch = originalFetch;
  globalThis.WebSocket = originalWebSocket;
});

test("discord adapter preserves image attachments on inbound messages", async () => {
  const DiscordBridgeAdapter = await loadDiscordAdapterClass();
  const originalFetch = globalThis.fetch;
  const originalWebSocket = globalThis.WebSocket;

  globalThis.fetch = async (url) => {
    if (String(url).includes("/gateway/bot")) {
      return new Response(JSON.stringify({ url: "wss://gateway.discord.gg" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (String(url) === "https://cdn.example.test/image.png") {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  };
  globalThis.WebSocket = MockWebSocket;

  const adapter = new DiscordBridgeAdapter({
    bridge_discord_enabled: "true",
    bridge_discord_bot_token: "discord-token",
  });
  await adapter.start();

  const socket = MockWebSocket.instances.at(-1);
  socket.emit("message", {
    data: JSON.stringify({
      op: 0,
      t: "MESSAGE_CREATE",
      s: 5,
      d: {
        id: "msg-4",
        channel_id: "dm-2",
        content: "",
        timestamp: "2026-03-26T10:03:00.000Z",
        author: { id: "user-3", username: "carol", bot: false },
        mentions: [],
        attachments: [
          {
            id: "att-1",
            filename: "image.png",
            content_type: "image/png",
            size: 3,
            url: "https://cdn.example.test/image.png",
          },
        ],
      },
    }),
  });

  const inbound = await adapter.consumeOne();
  assert.equal(inbound.text, "");
  assert.equal(inbound.attachments?.length, 1);
  assert.equal(inbound.attachments?.[0]?.name, "image.png");

  await adapter.stop();
  globalThis.fetch = originalFetch;
  globalThis.WebSocket = originalWebSocket;
});

test("discord adapter turns button interactions into inbound callback messages", async () => {
  const DiscordBridgeAdapter = await loadDiscordAdapterClass();
  const originalFetch = globalThis.fetch;
  const originalWebSocket = globalThis.WebSocket;

  globalThis.fetch = async (url) => {
    if (String(url).includes("/gateway/bot")) {
      return new Response(JSON.stringify({ url: "wss://gateway.discord.gg" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (String(url).includes("/interactions/")) {
      return new Response("{}", { status: 200 });
    }
    throw new Error(`Unexpected fetch ${url}`);
  };
  globalThis.WebSocket = MockWebSocket;

  const adapter = new DiscordBridgeAdapter({
    bridge_discord_enabled: "true",
    bridge_discord_bot_token: "discord-token",
  });
  await adapter.start();

  const socket = MockWebSocket.instances.at(-1);
  socket.emit("message", {
    data: JSON.stringify({
      op: 0,
      t: "INTERACTION_CREATE",
      s: 6,
      d: {
        id: "it-1",
        token: "it-token",
        channel_id: "dm-3",
        data: { custom_id: "Alpha" },
        user: { id: "user-4", username: "dana" },
        message: { id: "source-message-1" },
      },
    }),
  });

  const inbound = await adapter.consumeOne();
  assert.equal(inbound.text, "Alpha");
  assert.equal(inbound.callbackData, "Alpha");
  assert.equal(inbound.callbackMessageId, "source-message-1");

  await adapter.stop();
  globalThis.fetch = originalFetch;
  globalThis.WebSocket = originalWebSocket;
});
