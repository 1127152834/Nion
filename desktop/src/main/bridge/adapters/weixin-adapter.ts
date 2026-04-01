import {
  BaseBridgeAdapter,
  type BridgeAdapterStatus,
  type BridgeInboundMessage,
  type BridgeOutboundMessage,
} from "../base-adapter.js";
import type { WeixinBridgeAccount } from "../weixin-store.js";
import { decodeWeixinChatId, encodeWeixinChatId } from "../weixin/ids.js";
import { getWeixinUpdates, sendWeixinTextMessage } from "../weixin/api.js";
import {
  WEIXIN_DEFAULT_BASE_URL,
  WEIXIN_DEFAULT_CDN_BASE_URL,
  WEIXIN_MESSAGE_ITEM_TYPE,
  WEIXIN_SESSION_EXPIRED_ERRCODE,
  type WeixinCredentials,
  type WeixinGetUpdatesResponse,
  type WeixinMessage,
} from "../weixin/types.js";

type PendingCursor = {
  offsetKey: string;
  cursor: string;
  remaining: number;
  sealed: boolean;
};

export class WeixinBridgeAdapter extends BaseBridgeAdapter {
  readonly platform = "weixin";
  private running = false;
  private inbox: BridgeInboundMessage[] = [];
  private waiters: Array<(message: BridgeInboundMessage | null) => void> = [];
  private pollAborts = new Map<string, AbortController>();
  private seenMessageIds = new Map<string, Set<string>>();
  private pendingCursors = new Map<number, PendingCursor>();
  private nextBatchId = 1;
  private typingTickets = new Map<string, string>();

  constructor(
    private readonly settings: Record<string, string>,
    private readonly accountsStore: {
      listAccounts: () => WeixinBridgeAccount[];
      getAccount: (accountId: string) => WeixinBridgeAccount | null;
      getContextToken: (accountId: string, peerUserId: string) => string;
      upsertContextToken: (accountId: string, peerUserId: string, contextToken: string) => void;
    },
    private readonly offsetStore?: {
      getOffset: (key: string) => string;
      setOffset: (key: string, value: string) => void;
    },
  ) {
    super();
  }

  private enqueue(message: BridgeInboundMessage) {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(message);
      return;
    }
    this.inbox.push(message);
  }

  private accountToCredentials(account: WeixinBridgeAccount): WeixinCredentials {
    return {
      botToken: account.token,
      ilinkBotId: account.accountId,
      baseUrl: account.baseUrl || WEIXIN_DEFAULT_BASE_URL,
      cdnBaseUrl: account.cdnBaseUrl || WEIXIN_DEFAULT_CDN_BASE_URL,
    };
  }

  private async sleep(ms: number, signal?: AbortSignal) {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }

  private maybeCommitPendingCursor(batchId: number) {
    const batch = this.pendingCursors.get(batchId);
    if (!batch || !batch.sealed || batch.remaining > 0 || !this.offsetStore) {
      return;
    }
    this.offsetStore.setOffset(batch.offsetKey, batch.cursor);
    this.pendingCursors.delete(batchId);
  }

  private async processMessage(account: WeixinBridgeAccount, message: WeixinMessage, batchId?: number) {
    if (!message.from_user_id) {
      return;
    }

    const messageKey = message.message_id || `seq_${message.seq || Date.now()}`;
    const seen = this.seenMessageIds.get(account.accountId) ?? new Set<string>();
    this.seenMessageIds.set(account.accountId, seen);
    if (seen.has(messageKey)) {
      return;
    }
    seen.add(messageKey);
    if (seen.size > 500) {
      const staleKeys = [...seen].slice(0, seen.size - 500);
      for (const staleKey of staleKeys) {
        seen.delete(staleKey);
      }
    }

    if (message.context_token) {
      this.accountsStore.upsertContextToken(
        account.accountId,
        message.from_user_id,
        message.context_token,
      );
    }

    let text = "";
    for (const item of message.item_list || []) {
      if (item.type === WEIXIN_MESSAGE_ITEM_TYPE.TEXT && item.text_item?.text) {
        text += item.text_item.text;
      }
    }

    if (message.ref_message) {
      const refParts = [message.ref_message.title, message.ref_message.content].filter(Boolean);
      if (refParts.length > 0) {
        text = `[引用: ${refParts.join(" | ")}]\n${text}`;
      }
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    if (typeof batchId === "number") {
      const batch = this.pendingCursors.get(batchId);
      if (batch) {
        batch.remaining += 1;
      }
    }

    this.enqueue({
      platform: this.platform,
      chatId: encodeWeixinChatId(account.accountId, message.from_user_id),
      userId: message.from_user_id,
      text: trimmed,
      messageId: message.message_id || `weixin_${account.accountId}_${message.seq || Date.now()}`,
      timestamp: message.create_time ? message.create_time * 1_000 : Date.now(),
      updateId: batchId,
    });
  }

  private async runPollLoop(account: WeixinBridgeAccount, signal: AbortSignal) {
    while (this.running && !signal.aborted) {
      try {
        const offsetKey = `weixin:${account.accountId}`;
        const cursor = this.offsetStore?.getOffset(offsetKey) || "";
        const response: WeixinGetUpdatesResponse = await getWeixinUpdates(
          this.accountToCredentials(account),
          cursor === "0" ? "" : cursor,
        );

        if (response.errcode === WEIXIN_SESSION_EXPIRED_ERRCODE) {
          await this.sleep(10_000, signal);
          continue;
        }

        if (response.errcode && response.errcode !== 0) {
          throw new Error(response.errmsg || `Weixin error ${response.errcode}`);
        }

        let batchId: number | undefined;
        if ((response.msgs?.length || 0) > 0 && response.get_updates_buf) {
          batchId = this.nextBatchId++;
          this.pendingCursors.set(batchId, {
            offsetKey,
            cursor: response.get_updates_buf,
            remaining: 0,
            sealed: false,
          });
        }

        for (const message of response.msgs || []) {
          await this.processMessage(account, message, batchId);
        }

        if (typeof batchId === "number") {
          const pending = this.pendingCursors.get(batchId);
          if (pending) {
            pending.sealed = true;
            this.maybeCommitPendingCursor(batchId);
          }
        } else if (response.get_updates_buf && this.offsetStore) {
          this.offsetStore.setOffset(offsetKey, response.get_updates_buf);
        }
      } catch (error) {
        if (signal.aborted) {
          break;
        }
        console.error(`[bridge/weixin] poll error for ${account.accountId}`, error);
        await this.sleep(2_000, signal);
      }
    }
  }

  private startAccountWorker(account: WeixinBridgeAccount) {
    const controller = new AbortController();
    this.pollAborts.set(account.accountId, controller);
    void this.runPollLoop(account, controller.signal);
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    const validation = this.validateConfig();
    if (validation) {
      throw new Error(validation);
    }

    this.running = true;
    for (const account of this.accountsStore.listAccounts().filter((item) => item.enabled && item.token)) {
      this.startAccountWorker(account);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    for (const controller of this.pollAborts.values()) {
      controller.abort();
    }
    this.pollAborts.clear();
    this.typingTickets.clear();
    while (this.waiters.length > 0) {
      this.waiters.shift()?.(null);
    }
  }

  acknowledgeUpdate(updateId: number) {
    const batch = this.pendingCursors.get(updateId);
    if (!batch) {
      return;
    }
    batch.remaining = Math.max(0, batch.remaining - 1);
    this.maybeCommitPendingCursor(updateId);
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
      this.waiters.push(resolve);
    });
  }

  async send(message: BridgeOutboundMessage): Promise<void> {
    const decoded = decodeWeixinChatId(message.chatId);
    if (!decoded) {
      throw new Error("Invalid Weixin chat id");
    }

    const account = this.accountsStore.getAccount(decoded.accountId);
    if (!account) {
      throw new Error(`Weixin account ${decoded.accountId} not found`);
    }

    const contextToken = this.accountsStore.getContextToken(decoded.accountId, decoded.peerUserId);
    if (!contextToken) {
      throw new Error(`No Weixin context token for ${decoded.peerUserId}`);
    }

    const text = message.text
      .replace(/<[^>]+>/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    await sendWeixinTextMessage(
      this.accountToCredentials(account),
      decoded.peerUserId,
      text,
      contextToken,
    );
  }

  onMessageStart(_chatId: string): void {
    // Keep Weixin text path minimal for now. Typing can be added on top of getConfig/sendtyping later.
  }

  onMessageEnd(_chatId: string): void {}

  validateConfig(): string | null {
    const enabledAccounts = this.accountsStore.listAccounts().filter((item) => item.enabled && item.token);
    if (enabledAccounts.length === 0) {
      return "No enabled Weixin accounts";
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
}
