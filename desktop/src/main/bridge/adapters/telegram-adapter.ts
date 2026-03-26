import crypto from "node:crypto";

import {
  BaseBridgeAdapter,
  type BridgeAdapterStatus,
  type BridgeInboundMessage,
  type BridgeOutboundMessage,
} from "../base-adapter.js";
import {
  downloadTelegramDocumentImage,
  downloadTelegramPhoto,
  type TelegramDocument,
  type TelegramPhotoSize,
} from "./telegram-media.js";

const TELEGRAM_API = "https://api.telegram.org";

type TelegramOffsetStore = {
  getOffset: (key: string) => string;
  setOffset: (key: string, value: string) => void;
};

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; title?: string; username?: string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
    caption?: string;
    photo?: TelegramPhotoSize[];
    document?: TelegramDocument;
    date: number;
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number; first_name?: string; username?: string };
    message?: {
      message_id: number;
      chat: { id: number };
    };
  };
};

function tokenShortHash(botToken: string) {
  return crypto.createHash("sha256").update(botToken).digest("hex").slice(0, 8);
}

export class TelegramBridgeAdapter extends BaseBridgeAdapter {
  readonly platform = "telegram";
  private running = false;
  private abortController: AbortController | null = null;
  private inbox: BridgeInboundMessage[] = [];
  private waiters: Array<(message: BridgeInboundMessage | null) => void> = [];
  private committedOffset = 0;
  private botUserId: string | null = null;
  private typingIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private previewDegraded = new Set<string>();

  constructor(
    private readonly settings: Record<string, string>,
    private readonly offsetStore?: TelegramOffsetStore,
  ) {
    super();
  }

  private get botToken() {
    return this.settings.bridge_telegram_bot_token || "";
  }

  private enqueue(message: BridgeInboundMessage) {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(message);
      return;
    }
    this.inbox.push(message);
  }

  private offsetKey() {
    if (this.botUserId) {
      return `telegram:bot:${this.botUserId}`;
    }
    if (!this.botToken) {
      return "telegram";
    }
    return `telegram:${tokenShortHash(this.botToken)}`;
  }

  private persistCommittedOffset() {
    if (this.committedOffset <= 0 || !this.offsetStore) {
      return;
    }
    this.offsetStore.setOffset(this.offsetKey(), String(this.committedOffset));
  }

  private async resolveBotIdentity() {
    const token = this.botToken;
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${TELEGRAM_API}/bot${token}/getMe`, {
        signal: AbortSignal.timeout(10_000),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        result?: { id?: number };
      };

      if (payload.ok && payload.result?.id) {
        this.botUserId = String(payload.result.id);
      }
    } catch {
      this.botUserId = null;
    }
  }

  private async callTelegramApi(
    method: string,
    body?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Record<string, any>> {
    const token = this.botToken;
    if (!token) {
      throw new Error("Telegram bot token is unavailable");
    }

    const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ?? AbortSignal.timeout(30_000),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, any>;

    if (!response.ok || payload.ok === false) {
      const description =
        (typeof payload.description === "string" && payload.description) ||
        `Telegram ${method} failed`;
      throw new Error(description);
    }

    return payload;
  }

  private async answerCallback(callbackQueryId: string) {
    await this.callTelegramApi("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
    }).catch(() => {});
  }

  private isAuthorized(userId: string, chatId: string) {
    const allowedUsers = this.settings.telegram_bridge_allowed_users || "";
    if (allowedUsers.trim()) {
      const allowed = allowedUsers
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (allowed.length > 0) {
        return allowed.includes(userId) || allowed.includes(chatId);
      }
    }

    if (this.settings.bridge_telegram_chat_id) {
      return chatId === this.settings.bridge_telegram_chat_id;
    }

    return true;
  }

  private async pollLoop() {
    const persistedOffset = Number.parseInt(this.offsetStore?.getOffset(this.offsetKey()) || "0", 10);
    this.committedOffset = Number.isFinite(persistedOffset) ? persistedOffset : 0;
    let fetchOffset = this.committedOffset;

    while (this.running) {
      try {
        const payload = (await this.callTelegramApi("getUpdates", {
          offset: fetchOffset,
          timeout: 30,
          allowed_updates: ["message", "callback_query"],
        }, this.abortController?.signal)) as {
          result?: TelegramUpdate[];
        };

        if (!Array.isArray(payload.result)) {
          continue;
        }

        for (const update of payload.result) {
          if (update.update_id >= fetchOffset) {
            fetchOffset = update.update_id + 1;
          }

          if (update.callback_query) {
            const callback = update.callback_query;
            const chatId = callback.message?.chat?.id
              ? String(callback.message.chat.id)
              : "";
            const userId = String(callback.from.id);

            if (!this.isAuthorized(userId, chatId)) {
              this.acknowledgeUpdate(update.update_id);
              void this.answerCallback(callback.id);
              continue;
            }

            this.enqueue({
              platform: this.platform,
              chatId,
              userId,
              text: callback.data || "",
              messageId: callback.id,
              timestamp: Date.now(),
              callbackData: callback.data,
              callbackMessageId: callback.message?.message_id
                ? String(callback.message.message_id)
                : undefined,
              updateId: update.update_id,
            });
            void this.answerCallback(callback.id);
            continue;
          }

          if (!update.message) {
            this.acknowledgeUpdate(update.update_id);
            continue;
          }

          const message = update.message;
          const text = (message.text ?? message.caption ?? "").trim();
          const chatId = String(message.chat.id);
          const userId = message.from ? String(message.from.id) : chatId;

          if (!this.isAuthorized(userId, chatId)) {
            this.acknowledgeUpdate(update.update_id);
            continue;
          }

          const attachments = [];
          if (Array.isArray(message.photo) && message.photo.length > 0) {
            const photo = await downloadTelegramPhoto(
              this.botToken,
              message.photo,
              String(message.message_id),
            ).catch(() => null);
            if (photo) {
              attachments.push(photo);
            }
          }
          if (message.document) {
            const documentImage = await downloadTelegramDocumentImage(
              this.botToken,
              message.document,
              String(message.message_id),
            ).catch(() => null);
            if (documentImage) {
              attachments.push(documentImage);
            }
          }

          if (!text && attachments.length === 0) {
            this.acknowledgeUpdate(update.update_id);
            continue;
          }

          this.enqueue({
            platform: this.platform,
            chatId,
            userId,
            text,
            messageId: String(message.message_id),
            timestamp: message.date * 1_000,
            updateId: update.update_id,
            ...(attachments.length > 0 ? { attachments } : {}),
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          break;
        }
        if (this.running) {
          await new Promise((resolve) => setTimeout(resolve, 5_000));
        }
      }
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

    await this.resolveBotIdentity();
    this.running = true;
    this.abortController = new AbortController();
    void this.pollLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.abortController?.abort();
    this.abortController = null;
    this.persistCommittedOffset();
    for (const interval of this.typingIntervals.values()) {
      clearInterval(interval);
    }
    this.typingIntervals.clear();
    this.previewDegraded.clear();

    while (this.waiters.length > 0) {
      this.waiters.shift()?.(null);
    }
  }

  async consumeOne(): Promise<BridgeInboundMessage | null> {
    const queued = this.inbox.shift();
    if (queued) {
      return queued;
    }
    if (!this.running) {
      return null;
    }
    return new Promise<BridgeInboundMessage | null>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  acknowledgeUpdate(updateId: number) {
    this.committedOffset = Math.max(this.committedOffset, updateId + 1);
    this.persistCommittedOffset();
  }

  async send(message: BridgeOutboundMessage): Promise<void> {
    const validation = this.validateConfig();
    if (validation) {
      throw new Error(validation);
    }

    await this.callTelegramApi("sendMessage", {
      chat_id: message.chatId,
      text: message.text,
      disable_web_page_preview: true,
      ...(message.parseMode === "HTML"
        ? { parse_mode: "HTML" }
        : message.parseMode === "Markdown"
          ? { parse_mode: "Markdown" }
          : {}),
      ...(message.replyToMessageId ? { reply_to_message_id: message.replyToMessageId } : {}),
      ...(message.inlineButtons
        ? {
            reply_markup: {
              inline_keyboard: message.inlineButtons.map((row) =>
                row.map((button) => ({
                  text: button.text,
                  callback_data: button.callbackData,
                })),
              ),
            },
          }
        : {}),
    });
  }

  getPreviewCapabilities(chatId: string) {
    if (this.previewDegraded.has(chatId)) {
      return null;
    }
    return { supported: true, privateOnly: false };
  }

  async sendPreview(chatId: string, text: string, draftId: number) {
    try {
      await this.callTelegramApi("sendMessageDraft", {
        chat_id: chatId,
        text,
        draft_id: draftId,
      });
      return "sent" as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/404|400|not found|bad request/i.test(message)) {
        this.previewDegraded.add(chatId);
        return "degrade" as const;
      }
      return "skip" as const;
    }
  }

  endPreview(_chatId: string, _draftId: number): void {
    // Final sendMessage naturally supersedes the preview draft.
  }

  onMessageStart(chatId: string): void {
    this.onMessageEnd(chatId);
    const sendTyping = () => {
      void this.callTelegramApi("sendChatAction", {
        chat_id: chatId,
        action: "typing",
      }).catch(() => {});
    };

    sendTyping();
    this.typingIntervals.set(chatId, setInterval(sendTyping, 5_000));
  }

  onMessageEnd(chatId: string): void {
    const interval = this.typingIntervals.get(chatId);
    if (interval) {
      clearInterval(interval);
      this.typingIntervals.delete(chatId);
    }
  }

  validateConfig(): string | null {
    if (this.settings.bridge_telegram_enabled !== "true") {
      return "bridge_telegram_enabled is not true";
    }
    if (!this.settings.bridge_telegram_bot_token) {
      return "bridge_telegram_bot_token not configured";
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
      const payload = (await this.callTelegramApi("getMe")) as {
        result?: { username?: string };
      };
      return {
        ok: true,
        message: payload.result?.username
          ? `Telegram bot verified: @${payload.result.username}`
          : "Telegram bot verified",
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Telegram bot verification failed",
      };
    }
  }
}
