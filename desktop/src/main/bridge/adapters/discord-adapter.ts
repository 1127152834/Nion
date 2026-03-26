import {
  BaseBridgeAdapter,
  type BridgeAdapterStatus,
  type BridgeFileAttachment,
  type BridgeInboundMessage,
  type BridgeOutboundMessage,
} from "../base-adapter.js";

const DISCORD_REST_API = "https://discord.com/api/v10";
const DISCORD_GATEWAY_VERSION = "10";
const DISCORD_INTENTS = {
  GUILDS: 1 << 0,
  GUILD_MESSAGES: 1 << 9,
  DIRECT_MESSAGES: 1 << 12,
  MESSAGE_CONTENT: 1 << 15,
} as const;
const DISCORD_GATEWAY_OP = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
} as const;
const DISCORD_MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

type DiscordGatewayPayload = {
  op: number;
  d?: unknown;
  s?: number | null;
  t?: string;
};

type DiscordMessageCreate = {
  id: string;
  channel_id: string;
  guild_id?: string;
  content?: string;
  timestamp?: string;
  author?: {
    id?: string;
    username?: string;
    bot?: boolean;
  };
  mentions?: Array<{
    id?: string;
  }>;
  attachments?: Array<{
    filename?: string;
    content_type?: string;
    size?: number;
    url?: string;
  }>;
};

type DiscordInteractionCreate = {
  id: string;
  token: string;
  type?: number;
  data?: {
    custom_id?: string;
  };
  channel_id?: string;
  user?: {
    id?: string;
    username?: string;
  };
  member?: {
    user?: {
      id?: string;
      username?: string;
    };
  };
  message?: {
    id?: string;
  };
};

function buildDiscordGatewayUrl(url: string) {
  const suffix = `?v=${DISCORD_GATEWAY_VERSION}&encoding=json`;
  return url.includes("?") ? url : `${url}${suffix}`;
}

export class DiscordBridgeAdapter extends BaseBridgeAdapter {
  readonly platform = "discord";
  private running = false;
  private readonly settings: Record<string, string>;
  private socket: any | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private inbox: BridgeInboundMessage[] = [];
  private waiter: ((message: BridgeInboundMessage | null) => void) | null = null;
  private botUserId: string | null = null;
  private sessionId: string | null = null;
  private lastSequence: number | null = null;
  private shouldReconnect = false;
  private reconnectAttempts = 0;
  private seenMessageIds = new Set<string>();
  private typingIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private previewMessages = new Map<string, string>();
  private previewDegraded = new Set<string>();

  constructor(settings: Record<string, string>) {
    super();
    this.settings = settings;
  }

  private get botToken() {
    return this.settings.bridge_discord_bot_token || "";
  }

  private enqueue(message: BridgeInboundMessage) {
    if (this.waiter) {
      const resolve = this.waiter;
      this.waiter = null;
      resolve(message);
      return;
    }
    this.inbox.push(message);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startHeartbeat(socket: any, intervalMs: number) {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (socket?.readyState === 1) {
        socket.send(JSON.stringify({ op: DISCORD_GATEWAY_OP.HEARTBEAT, d: this.lastSequence }));
      }
    }, intervalMs);
  }

  private async discordRest<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.botToken;
    if (!token) {
      throw new Error("Discord bot token is unavailable");
    }

    const response = await fetch(`${DISCORD_REST_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bot ${token}`,
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(payload.message || `Discord request failed: HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private async getGatewayUrl() {
    const payload = await this.discordRest<{ url: string }>("/gateway/bot");
    if (!payload.url) {
      throw new Error("Discord gateway response missing url");
    }
    return buildDiscordGatewayUrl(payload.url);
  }

  private buildIdentifyPayload() {
    return {
      op: DISCORD_GATEWAY_OP.IDENTIFY,
      d: {
        token: this.botToken,
        intents:
          DISCORD_INTENTS.GUILDS |
          DISCORD_INTENTS.GUILD_MESSAGES |
          DISCORD_INTENTS.DIRECT_MESSAGES |
          DISCORD_INTENTS.MESSAGE_CONTENT,
        properties: {
          os: process.platform,
          browser: "nion-desktop",
          device: "nion-desktop",
        },
      },
    };
  }

  private buildResumePayload() {
    return {
      op: DISCORD_GATEWAY_OP.RESUME,
      d: {
        token: this.botToken,
        session_id: this.sessionId,
        seq: this.lastSequence,
      },
    };
  }

  private shouldHandleGuildMessage(message: DiscordMessageCreate) {
    if (!message.guild_id) {
      return true;
    }
    if (!this.botUserId) {
      return false;
    }
    return (message.mentions || []).some((mention) => mention.id === this.botUserId);
  }

  private stripBotMention(text: string) {
    if (!this.botUserId) {
      return text.trim();
    }
    return text
      .replace(new RegExp(`<@!?${this.botUserId}>`, "g"), "")
      .trim();
  }

  private async downloadAttachments(
    attachments: Array<{
      filename?: string;
      content_type?: string;
      size?: number;
      url?: string;
    }>,
  ): Promise<BridgeFileAttachment[]> {
    const results: BridgeFileAttachment[] = [];
    for (const attachment of attachments) {
      if (!attachment.url || !attachment.filename) {
        continue;
      }
      if (typeof attachment.size === "number" && attachment.size > DISCORD_MAX_ATTACHMENT_SIZE) {
        continue;
      }
      try {
        const response = await fetch(attachment.url, {
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
          continue;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > DISCORD_MAX_ATTACHMENT_SIZE) {
          continue;
        }
        results.push({
          id: attachment.filename,
          name: attachment.filename,
          type: attachment.content_type || "application/octet-stream",
          size: buffer.length,
          data: buffer.toString("base64"),
        });
      } catch {
        // Best effort only.
      }
    }
    return results;
  }

  private handleMessageCreate(message: DiscordMessageCreate) {
    if (!message.id || !message.channel_id || !message.author?.id) {
      return;
    }
    const author = message.author;
    if (message.author.bot) {
      return;
    }
    if (this.botUserId && message.author.id === this.botUserId) {
      return;
    }
    if (this.seenMessageIds.has(message.id)) {
      return;
    }
    this.seenMessageIds.add(message.id);
    if (this.seenMessageIds.size > 1_000) {
      const staleIds = [...this.seenMessageIds].slice(0, this.seenMessageIds.size - 1_000);
      for (const staleId of staleIds) {
        this.seenMessageIds.delete(staleId);
      }
    }
    if (!this.shouldHandleGuildMessage(message)) {
      return;
    }

    const text = this.stripBotMention(message.content || "");
    if (!text && !(message.attachments?.length)) {
      return;
    }

    void this.downloadAttachments(message.attachments || []).then((attachments) => {
      if (!text && attachments.length === 0) {
        return;
      }
      this.enqueue({
        platform: this.platform,
        chatId: message.channel_id,
        userId: author.id,
        text,
        messageId: message.id,
        timestamp: message.timestamp ? new Date(message.timestamp).getTime() : Date.now(),
        ...(attachments.length > 0 ? { attachments } : {}),
      });
    });
  }

  private async answerInteraction(interaction: DiscordInteractionCreate) {
    await fetch(
      `${DISCORD_REST_API}/interactions/${interaction.id}/${interaction.token}/callback`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 6 }),
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => {});
  }

  private handleInteractionCreate(interaction: DiscordInteractionCreate) {
    const callbackData = interaction.data?.custom_id;
    const user = interaction.user || interaction.member?.user;
    if (!callbackData || !interaction.channel_id || !user?.id) {
      return;
    }

    void this.answerInteraction(interaction);
    this.enqueue({
      platform: this.platform,
      chatId: interaction.channel_id,
      userId: user.id,
      text: callbackData,
      messageId: interaction.id,
      timestamp: Date.now(),
      callbackData,
      callbackMessageId: interaction.message?.id,
    });
  }

  private async handleGatewayPayload(payload: DiscordGatewayPayload, socket: any) {
    if (typeof payload.s === "number") {
      this.lastSequence = payload.s;
    }

    switch (payload.op) {
      case DISCORD_GATEWAY_OP.HELLO: {
        const intervalMs =
          (payload.d as { heartbeat_interval?: number } | undefined)?.heartbeat_interval || 41_250;
        this.startHeartbeat(socket, intervalMs);
        const canResume = this.sessionId && this.lastSequence !== null;
        socket.send(
          JSON.stringify(canResume ? this.buildResumePayload() : this.buildIdentifyPayload()),
        );
        return;
      }
      case DISCORD_GATEWAY_OP.DISPATCH: {
        if (payload.t === "READY") {
          const ready = payload.d as {
            session_id?: string;
            user?: { id?: string };
          };
          this.sessionId = ready.session_id || null;
          this.botUserId = ready.user?.id || this.botUserId;
          this.reconnectAttempts = 0;
          return;
        }
        if (payload.t === "RESUMED") {
          this.reconnectAttempts = 0;
          return;
        }
        if (payload.t === "MESSAGE_CREATE") {
          this.handleMessageCreate(payload.d as DiscordMessageCreate);
        }
        if (payload.t === "INTERACTION_CREATE") {
          this.handleInteractionCreate(payload.d as DiscordInteractionCreate);
        }
        return;
      }
      case DISCORD_GATEWAY_OP.RECONNECT:
        socket.close(4_000, "Discord requested reconnect");
        return;
      case DISCORD_GATEWAY_OP.INVALID_SESSION:
        this.sessionId = null;
        this.lastSequence = null;
        socket.close(4_000, "Discord invalid session");
        return;
      default:
        return;
    }
  }

  private async connectGateway(url: string): Promise<void> {
    const WebSocketCtor = (globalThis as any).WebSocket;
    if (!WebSocketCtor) {
      throw new Error("WebSocket is unavailable in the desktop runtime");
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocketCtor(url);
      this.socket = socket;
      let ready = false;

      socket.addEventListener("message", (event: any) => {
        try {
          const payload = JSON.parse(String(event.data)) as DiscordGatewayPayload;
          void this.handleGatewayPayload(payload, socket);
          if (payload.op === DISCORD_GATEWAY_OP.DISPATCH && payload.t === "READY" && !ready) {
            ready = true;
            resolve();
          }
        } catch (error) {
          console.error("[bridge/discord] failed to parse gateway payload", error);
        }
      });

      socket.addEventListener("close", (event: any) => {
        this.stopHeartbeat();
        this.socket = null;

        if (!ready) {
          reject(
            new Error(`Discord gateway closed before READY: ${event?.code || ""}`.trim()),
          );
          return;
        }

        if (this.shouldReconnect && this.running) {
          void this.scheduleReconnect();
        }
      });

      socket.addEventListener("error", (event: any) => {
        if (!ready) {
          reject(
            event?.error instanceof Error
              ? event.error
              : new Error("Discord gateway connection error"),
          );
        }
      });
    });
  }

  private async scheduleReconnect() {
    if (!this.shouldReconnect || !this.running) {
      return;
    }

    this.reconnectAttempts += 1;
    const delay = Math.min(1_000 * 2 ** (this.reconnectAttempts - 1), 60_000);
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (!this.shouldReconnect || !this.running) {
      return;
    }

    try {
      const gatewayUrl = await this.getGatewayUrl();
      await this.connectGateway(gatewayUrl);
    } catch (error) {
      console.error("[bridge/discord] reconnect failed", error);
      void this.scheduleReconnect();
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    const validation = this.validateConfig();
    if (validation) {
      throw new Error(validation);
    }

    const gatewayUrl = await this.getGatewayUrl();
    this.running = true;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    await this.connectGateway(gatewayUrl);
  }

  async stop(): Promise<void> {
    this.running = false;
    this.shouldReconnect = false;
    this.stopHeartbeat();
    for (const interval of this.typingIntervals.values()) {
      clearInterval(interval);
    }
    this.typingIntervals.clear();
    this.previewMessages.clear();
    this.previewDegraded.clear();

    if (this.socket) {
      this.socket.close(1_000, "Bridge stopping");
      this.socket = null;
    }

    if (this.waiter) {
      const resolve = this.waiter;
      this.waiter = null;
      resolve(null);
    }
  }

  async consumeOne(): Promise<BridgeInboundMessage | null> {
    const next = this.inbox.shift();
    if (next) {
      return next;
    }
    if (!this.running) {
      return null;
    }
    return new Promise<BridgeInboundMessage | null>((resolve) => {
      this.waiter = resolve;
    });
  }

  async send(message: BridgeOutboundMessage): Promise<void> {
    const validation = this.validateConfig();
    if (validation) {
      throw new Error(validation);
    }

    await this.discordRest(`/channels/${message.chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content:
          message.parseMode === "HTML"
            ? message.text.replace(/<[^>]+>/g, "")
            : message.text,
        ...(message.inlineButtons
          ? {
              components: message.inlineButtons.map((row) => ({
                type: 1,
                components: row.map((button) => ({
                  type: 2,
                  style: 1,
                  label: button.text,
                  custom_id: button.callbackData,
                })),
              })),
            }
          : {}),
      }),
    });
  }

  getPreviewCapabilities(chatId: string) {
    if (this.previewDegraded.has(chatId)) {
      return null;
    }
    return { supported: true, privateOnly: false };
  }

  async sendPreview(chatId: string, text: string, _draftId: number) {
    try {
      const existingMessageId = this.previewMessages.get(chatId);
      if (existingMessageId) {
        await this.discordRest(`/channels/${chatId}/messages/${existingMessageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text.slice(0, 2_000) }),
        });
      } else {
        const response = await this.discordRest<{ id?: string }>(`/channels/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text.slice(0, 2_000) }),
        });
        if (response.id) {
          this.previewMessages.set(chatId, response.id);
        }
      }
      return "sent" as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/403|404|unknown channel|missing access/i.test(message)) {
        this.previewDegraded.add(chatId);
        return "degrade" as const;
      }
      return "skip" as const;
    }
  }

  endPreview(chatId: string, _draftId: number): void {
    const previewMessageId = this.previewMessages.get(chatId);
    if (previewMessageId) {
      void this.discordRest(`/channels/${chatId}/messages/${previewMessageId}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    this.previewMessages.delete(chatId);
  }

  onMessageStart(chatId: string): void {
    this.onMessageEnd(chatId);
    const sendTyping = () => {
      void this.discordRest(`/channels/${chatId}/typing`, {
        method: "POST",
      }).catch(() => {});
    };
    sendTyping();
    this.typingIntervals.set(chatId, setInterval(sendTyping, 8_000));
  }

  onMessageEnd(chatId: string): void {
    const interval = this.typingIntervals.get(chatId);
    if (interval) {
      clearInterval(interval);
      this.typingIntervals.delete(chatId);
    }
  }

  validateConfig(): string | null {
    if (this.settings.bridge_discord_enabled !== "true") {
      return "bridge_discord_enabled is not true";
    }
    if (!this.settings.bridge_discord_bot_token) {
      return "bridge_discord_bot_token not configured";
    }
    return null;
  }

  getStatus(): BridgeAdapterStatus {
    return {
      platform: this.platform,
      running: this.running,
      connectedAt: null,
      error: this.validateConfig(),
    };
  }

  async probe() {
    const validation = this.validateConfig();
    if (validation) {
      return { ok: false, message: validation };
    }

    try {
      const payload = await this.discordRest<{
        username?: string;
        discriminator?: string;
        id?: string;
      }>("/users/@me");
      return {
        ok: true,
        message: payload.username
          ? `Discord bot verified: ${payload.username}#${payload.discriminator || "0"}`
          : payload.id || "Discord bot verified",
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Discord probe failed",
      };
    }
  }
}
