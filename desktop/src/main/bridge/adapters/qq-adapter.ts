import {
  BaseBridgeAdapter,
  type BridgeAdapterStatus,
  type BridgeFileAttachment,
  type BridgeInboundMessage,
  type BridgeOutboundMessage,
} from "../base-adapter.js";
import {
  QQ_GATEWAY_INTENTS,
  QQ_GATEWAY_OP,
  buildQqHeartbeat,
  buildQqIdentify,
  buildQqResume,
  clearQqTokenCache,
  getQqAccessToken,
  getQqGatewayUrl,
  nextQqMessageSequence,
  sendQqPrivateMessage,
  type QQGatewayPayload,
} from "./qq-api.js";

type QQC2CMessageData = {
  id: string;
  author?: {
    user_openid?: string;
  };
  content?: string;
  timestamp?: string;
  attachments?: Array<{
    content_type?: string;
    filename?: string;
    url?: string;
    size?: number;
  }>;
};

const QQ_MAX_FILE_SIZE = 20 * 1024 * 1024;

async function verifyQqConfig(payload: {
  appId?: string;
  appSecret?: string;
}) {
  const appId = payload.appId?.trim();
  const appSecret = payload.appSecret?.trim();

  if (!appId || !appSecret) {
    return { verified: false, error: "QQ bot credentials are unavailable" };
  }

  try {
    const accessToken = await getQqAccessToken(appId, appSecret);
    await getQqGatewayUrl(accessToken);
    return { verified: true };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export class QqBridgeAdapter extends BaseBridgeAdapter {
  readonly platform = "qq";
  private running = false;
  private inbox: BridgeInboundMessage[] = [];
  private waiter: ((message: BridgeInboundMessage | null) => void) | null = null;
  private socket: any | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string | null = null;
  private lastSequence: number | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = false;
  private seenMessageIds = new Set<string>();

  constructor(private readonly settings: Record<string, string>) {
    super();
  }

  private async getAccessToken() {
    return getQqAccessToken(
      this.settings.bridge_qq_app_id,
      this.settings.bridge_qq_app_secret,
    );
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

  private isAuthorized(userId: string) {
    const allowedUsers = this.settings.bridge_qq_allowed_users || "";
    if (!allowedUsers.trim()) {
      return true;
    }
    const allowed = allowedUsers
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return allowed.includes(userId);
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
        socket.send(JSON.stringify(buildQqHeartbeat(this.lastSequence)));
      }
    }, intervalMs);
  }

  private async downloadQqAttachments(
    attachments: Array<{
      content_type?: string;
      filename?: string;
      url?: string;
      size?: number;
    }>,
  ): Promise<BridgeFileAttachment[]> {
    const results: BridgeFileAttachment[] = [];
    for (const attachment of attachments) {
      if (!attachment.url || !attachment.content_type?.startsWith("image/")) {
        continue;
      }
      if (typeof attachment.size === "number" && attachment.size > QQ_MAX_FILE_SIZE) {
        continue;
      }

      const url = attachment.url.startsWith("//") ? `https:${attachment.url}` : attachment.url;
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
          continue;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > QQ_MAX_FILE_SIZE) {
          continue;
        }
        results.push({
          id: attachment.filename || url,
          name: attachment.filename || "qq-image",
          type: attachment.content_type,
          size: buffer.length,
          data: buffer.toString("base64"),
        });
      } catch {
        // Best effort only.
      }
    }
    return results;
  }

  private handleC2CMessage(data: QQC2CMessageData) {
    if (!data.id || !data.author?.user_openid) {
      return;
    }
    if (this.seenMessageIds.has(data.id)) {
      return;
    }
    this.seenMessageIds.add(data.id);
    if (this.seenMessageIds.size > 1_000) {
      const staleIds = [...this.seenMessageIds].slice(0, this.seenMessageIds.size - 1_000);
      for (const staleId of staleIds) {
        this.seenMessageIds.delete(staleId);
      }
    }

    const userId = data.author.user_openid;
    if (!this.isAuthorized(userId)) {
      return;
    }

    const text = (data.content || "").trim();
    if (!text && !(data.attachments?.length)) {
      return;
    }

    void this.downloadQqAttachments(data.attachments || []).then((attachments) => {
      if (!text && attachments.length === 0) {
        return;
      }
      this.enqueue({
        platform: this.platform,
        chatId: userId,
        userId,
        text,
        messageId: data.id,
        timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
        ...(attachments.length > 0 ? { attachments } : {}),
      });
    });
  }

  private async handleGatewayPayload(payload: QQGatewayPayload, accessToken: string, socket: any) {
    switch (payload.op) {
      case QQ_GATEWAY_OP.HELLO: {
        const intervalMs =
          (payload.d as { heartbeat_interval?: number } | undefined)?.heartbeat_interval ||
          41_250;
        this.startHeartbeat(socket, intervalMs);
        if (this.sessionId && this.lastSequence !== null) {
          socket.send(JSON.stringify(buildQqResume(accessToken, this.sessionId, this.lastSequence)));
        } else {
          socket.send(
            JSON.stringify(buildQqIdentify(accessToken, QQ_GATEWAY_INTENTS.PUBLIC_MESSAGES)),
          );
        }
        return;
      }
      case QQ_GATEWAY_OP.DISPATCH: {
        if (typeof payload.s === "number") {
          this.lastSequence = payload.s;
        }
        if (payload.t === "READY") {
          this.sessionId =
            (payload.d as { session_id?: string } | undefined)?.session_id || this.sessionId;
          this.reconnectAttempts = 0;
          return;
        }
        if (payload.t === "RESUMED") {
          this.reconnectAttempts = 0;
          return;
        }
        if (payload.t === "C2C_MESSAGE_CREATE") {
          this.handleC2CMessage(payload.d as QQC2CMessageData);
        }
        return;
      }
      case QQ_GATEWAY_OP.RECONNECT:
        socket.close(4_000, "Server requested reconnect");
        return;
      case QQ_GATEWAY_OP.INVALID_SESSION:
        this.sessionId = null;
        this.lastSequence = null;
        socket.close(4_000, "Invalid session");
        return;
      default:
        return;
    }
  }

  private async connectGateway(gatewayUrl: string, accessToken: string): Promise<void> {
    const WebSocketCtor = (globalThis as any).WebSocket;
    if (!WebSocketCtor) {
      throw new Error("WebSocket is unavailable in the desktop runtime");
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocketCtor(gatewayUrl);
      this.socket = socket;
      let ready = false;

      socket.addEventListener("open", () => {
        // Wait for HELLO/READY events.
      });

      socket.addEventListener("message", (event: any) => {
        try {
          const payload = JSON.parse(String(event.data)) as QQGatewayPayload;
          void this.handleGatewayPayload(payload, accessToken, socket);

          if (payload.op === QQ_GATEWAY_OP.DISPATCH && payload.t === "READY" && !ready) {
            ready = true;
            resolve();
          }
        } catch (error) {
          console.error("[bridge/qq] failed to parse gateway payload", error);
        }
      });

      socket.addEventListener("close", (event: any) => {
        this.stopHeartbeat();
        this.socket = null;

        if (!ready) {
          reject(new Error(`QQ gateway closed before READY: ${event?.code || ""}`.trim()));
          return;
        }

        if (this.shouldReconnect && this.running) {
          void this.scheduleReconnect();
        }
      });

      socket.addEventListener("error", (event: any) => {
        if (!ready) {
          reject(event?.error instanceof Error ? event.error : new Error("QQ gateway error"));
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
      const accessToken = await this.getAccessToken();
      const gatewayUrl = await getQqGatewayUrl(accessToken);
      await this.connectGateway(gatewayUrl, accessToken);
    } catch (error) {
      console.error("[bridge/qq] reconnect failed", error);
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

    clearQqTokenCache();
    const accessToken = await this.getAccessToken();
    const gatewayUrl = await getQqGatewayUrl(accessToken);

    this.running = true;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    await this.connectGateway(gatewayUrl, accessToken);
  }

  async stop(): Promise<void> {
    this.running = false;
    this.shouldReconnect = false;
    this.stopHeartbeat();

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
    if (!message.replyToMessageId) {
      throw new Error("QQ passive replies require replyToMessageId");
    }

    const accessToken = await this.getAccessToken();
    let content = message.text;
    content = content.replace(/<[^>]+>/g, "");
    const result = await sendQqPrivateMessage({
      accessToken,
      openid: message.chatId,
      content,
      msgId: message.replyToMessageId,
      msgSeq: nextQqMessageSequence(message.replyToMessageId),
    });
    if (!result.id) {
      return;
    }
  }

  validateConfig(): string | null {
    if (!this.settings.bridge_qq_app_id) {
      return "bridge_qq_app_id not configured";
    }
    if (!this.settings.bridge_qq_app_secret) {
      return "bridge_qq_app_secret not configured";
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
    const verification = await verifyQqConfig({
      appId: this.settings.bridge_qq_app_id,
      appSecret: this.settings.bridge_qq_app_secret,
    });
    return {
      ok: verification.verified,
      message: verification.error || "QQ bot credentials verified",
    };
  }
}
