import type { DesktopBridgeStatus } from "../../shared/bridge-ipc.js";
import type { BaseBridgeAdapter, BridgeInboundMessage, BridgeOutboundMessage } from "./base-adapter.js";
import type { BridgeBinding } from "./bindings-store.js";
import type { WeixinBridgeAccount } from "./weixin-store.js";
import { DiscordBridgeAdapter } from "./adapters/discord-adapter.js";
import { FeishuBridgeAdapter } from "./adapters/feishu-adapter.js";
import { QqBridgeAdapter } from "./adapters/qq-adapter.js";
import { TelegramBridgeAdapter } from "./adapters/telegram-adapter.js";
import { WeixinBridgeAdapter } from "./adapters/weixin-adapter.js";
import { createBridgeChannelRouter, type BridgeAddress } from "./channel-router.js";
import {
  createNionThreadClient,
  type ThreadStreamCallbacks,
  type ThreadToolEvent,
} from "./nion-thread-client.js";
import {
  deliverBridgeMessage,
} from "./delivery-layer.js";
import { isDangerousInput, sanitizeInput } from "./security/validators.js";

type BridgeThreadClient = ReturnType<typeof createNionThreadClient>;

type BridgeToolCallState = {
  id: string;
  name: string;
  status: "running" | "complete" | "error";
};

type BridgeCardStreamController = {
  create: (chatId: string, initialText: string, replyToMessageId?: string) => Promise<string>;
  update: (messageId: string, text: string) => Promise<"ok" | "fail">;
  updateToolCalls?: (messageId: string, tools: BridgeToolCallState[]) => void;
  finalize: (
    messageId: string,
    finalText: string,
    status?: "completed" | "interrupted" | "error",
  ) => Promise<void>;
};

type BridgeCardStreamingAdapter = BaseBridgeAdapter & {
  getCardStreamController?: () => BridgeCardStreamController | null;
};

type BridgePreviewState = {
  draftId: number;
  lastSentText: string;
  lastSentAt: number;
  pendingText: string;
  throttleTimer: ReturnType<typeof setTimeout> | null;
  degraded: boolean;
};

function isCardStreamingAdapter(adapter: BaseBridgeAdapter): adapter is BridgeCardStreamingAdapter {
  return typeof (adapter as BridgeCardStreamingAdapter).getCardStreamController === "function";
}

function upsertToolCallState(toolCalls: BridgeToolCallState[], event: ThreadToolEvent) {
  if (event.type === "tool_use") {
    const existing = toolCalls.find((toolCall) => toolCall.id === event.id);
    if (existing) {
      existing.name = event.name;
      existing.status = "running";
      return;
    }
    toolCalls.push({
      id: event.id,
      name: event.name,
      status: "running",
    });
    return;
  }

  const existing = toolCalls.find((toolCall) => toolCall.id === event.tool_use_id);
  if (existing) {
    existing.status = event.is_error ? "error" : "complete";
    return;
  }
  toolCalls.push({
    id: event.tool_use_id,
    name: event.name || "tool",
    status: event.is_error ? "error" : "complete",
  });
}

function extractClarificationText(events: Array<{ event: string; data: any }>) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const current = events[index];
    if (
      current.event === "messages-tuple" &&
      current.data?.type === "tool" &&
      current.data?.name === "ask_clarification" &&
      typeof current.data?.content === "string" &&
      current.data.content.trim()
    ) {
      return current.data.content.trim();
    }
  }
  return "";
}

function extractClarificationRequest(events: Array<{ event: string; data: any }>) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const current = events[index];
    if (current.event !== "custom" || current.data?.type !== "clarification_request") {
      continue;
    }
    return {
      question:
        typeof current.data.question === "string" ? current.data.question.trim() : "",
      context:
        typeof current.data.context === "string" ? current.data.context.trim() : "",
      options: Array.isArray(current.data.options)
        ? current.data.options.filter((item: unknown): item is string => typeof item === "string")
        : [],
    };
  }
  return null;
}

function extractPermissionRequest(events: Array<{ event: string; data: any }>) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const current = events[index];
    if (current.event !== "custom" || current.data?.type !== "permission_request") {
      continue;
    }
    return {
      id: typeof current.data.id === "string" ? current.data.id : "",
      toolName: typeof current.data.tool_name === "string" ? current.data.tool_name : "",
      toolInput: current.data.tool_input && typeof current.data.tool_input === "object"
        ? current.data.tool_input
        : {},
      reason:
        typeof current.data.reason_message === "string" ? current.data.reason_message.trim() : "",
      options: Array.isArray(current.data.options)
        ? current.data.options.filter((item: unknown): item is string => typeof item === "string")
        : [],
    };
  }
  return null;
}

function formatClarificationPrompt(clarification: {
  question: string;
  context: string;
  options: string[];
}) {
  const lines = [];
  if (clarification.context) {
    lines.push(`❓ ${clarification.context}`);
    lines.push("");
  }
  lines.push(clarification.question || "Please clarify how you want to continue.");
  if (clarification.options.length > 0) {
    lines.push("");
    clarification.options.forEach((option, index) => {
      lines.push(`${index + 1}. ${option}`);
    });
  }
  return lines.join("\n").trim();
}

function formatPermissionPrompt(permission: {
  id?: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  reason: string;
  supportsButtons?: boolean;
}) {
  const summary = JSON.stringify(permission.toolInput, null, 2);
  const lines = ["🔐 Permission Required", ""];
  if (permission.reason) {
    lines.push(permission.reason, "");
  }
  lines.push(`Tool: ${permission.toolName}`);
  if (summary && summary !== "{}") {
    lines.push(summary);
  }
  if (!permission.supportsButtons && permission.id) {
    lines.push(
      "",
      "Reply with one of:",
      `/perm allow ${permission.id}`,
      `/perm allow_session ${permission.id}`,
      `/perm deny ${permission.id}`,
    );
  }
  return lines.join("\n").trim();
}

export function createBridgeManager(options: {
  loadSettings: () => { settings: Record<string, string> };
  listBindings?: () => BridgeBinding[];
  upsertBinding?: (
    binding: Omit<BridgeBinding, "id" | "createdAt" | "updatedAt">,
  ) => BridgeBinding;
  defaultWorkingDirectory?: () => string;
  backendBaseUrl?: string;
  adapters?: BaseBridgeAdapter[];
  threadClient?: BridgeThreadClient;
  offsetStore?: {
    getOffset: (key: string) => string;
    setOffset: (key: string, value: string) => void;
  };
  weixinStore?: {
    listAccounts: () => WeixinBridgeAccount[];
    getAccount: (accountId: string) => WeixinBridgeAccount | null;
    getContextToken: (accountId: string, peerUserId: string) => string;
    upsertContextToken: (accountId: string, peerUserId: string, contextToken: string) => void;
  };
}) {
  const adapters = options.adapters ?? [];
  let running = false;
  let startedAt: string | null = null;
  let resolvedAdapters: BaseBridgeAdapter[] | null = null;
  const loopTasks = new Map<string, Promise<void>>();
  const router = createBridgeChannelRouter({
    listBindings: options.listBindings ?? (() => []),
    upsertBinding:
      options.upsertBinding ??
      ((binding) => ({
        ...binding,
        id: "stub-binding",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    defaultWorkingDirectory: options.defaultWorkingDirectory ?? (() => ""),
  });
  const threadClient =
    options.threadClient ??
    createNionThreadClient(options.backendBaseUrl ?? "http://127.0.0.1:43115");

  const enabledPlatformsFromSettings = () => {
    const settings = options.loadSettings().settings;
    return [
      ["telegram", settings.bridge_telegram_enabled],
      ["feishu", settings.bridge_feishu_enabled],
      ["discord", settings.bridge_discord_enabled],
      ["qq", settings.bridge_qq_enabled],
      ["weixin", settings.bridge_weixin_enabled],
    ]
      .filter(([, enabled]) => enabled === "true")
      .map(([platform]) => platform);
  };

  const defaultAdapters = () => {
    const settings = options.loadSettings().settings;
    return [
      new TelegramBridgeAdapter(settings, options.offsetStore),
      new FeishuBridgeAdapter(settings),
      new DiscordBridgeAdapter(settings),
      new QqBridgeAdapter(settings),
      new WeixinBridgeAdapter(
        settings,
        options.weixinStore ?? {
          listAccounts: () => [],
          getAccount: () => null,
          getContextToken: () => "",
          upsertContextToken: () => {},
        },
        options.offsetStore,
      ),
    ];
  };

  const resolveAdapters = () => {
    resolvedAdapters ??= adapters.length > 0 ? adapters : defaultAdapters();
    return resolvedAdapters;
  };

  const startableAdapters = () =>
    resolveAdapters().filter((adapter) => adapter.validateConfig() === null);

  const finalizeCardStream = async (
    controller: BridgeCardStreamController | null,
    messageId: string | null,
    text: string,
    status: "completed" | "interrupted" | "error",
  ) => {
    if (!controller || !messageId) {
      return;
    }
    await controller.finalize(messageId, text, status);
  };

  const deliverOutboundText = async (
    adapter: BaseBridgeAdapter,
    inbound: BridgeInboundMessage,
    binding: BridgeBinding,
    text: string,
    extra?: Pick<BridgeOutboundMessage, "inlineButtons">,
  ) => {
    await deliverBridgeMessage(adapter, {
      platform: inbound.platform,
      chatId: inbound.chatId,
      text,
      threadId: binding.threadId,
      replyToMessageId: inbound.messageId,
      ...(extra ?? {}),
    });
  };

  const flushPreview = async (
    adapter: BaseBridgeAdapter,
    chatId: string,
    previewState: BridgePreviewState,
  ) => {
    if (!adapter.sendPreview || previewState.degraded || !previewState.pendingText) {
      return;
    }

    const outcome = await adapter.sendPreview(chatId, previewState.pendingText, previewState.draftId);
    if (outcome === "degrade") {
      previewState.degraded = true;
    }
    if (outcome === "sent") {
      previewState.lastSentText = previewState.pendingText;
      previewState.lastSentAt = Date.now();
    }
  };

  const handleInboundMessage = async (
    adapter: BaseBridgeAdapter,
    inbound: BridgeInboundMessage,
  ) => {
    const binding = router.resolveBinding({
      platform: inbound.platform,
      chatId: inbound.chatId,
      userId: inbound.userId,
    });

    const permissionDecision =
      typeof inbound.callbackData === "string" && inbound.callbackData.startsWith("perm:")
        ? inbound.callbackData
        : typeof inbound.text === "string" && inbound.text.startsWith("/perm ")
          ? inbound.text
          : "";

    if (permissionDecision) {
      const normalized = permissionDecision.startsWith("/perm ")
        ? permissionDecision.replace("/perm ", "perm:")
        : permissionDecision;
      const [, action, ...rest] = normalized.split(":");
      const permissionRequestId = rest.join(":").trim();
      if (permissionRequestId && (action === "allow" || action === "allow_session" || action === "deny")) {
        const resolution = await threadClient.resolvePermission(
          binding.threadId,
          permissionRequestId,
          action,
        );
        const replyText =
          action === "deny"
            ? "Permission denied."
            : action === "allow_session"
              ? "Permission granted for this session. Retrying..."
              : "Permission granted. Retrying...";
        await deliverOutboundText(adapter, inbound, binding, replyText);
        if ((action === "allow" || action === "allow_session") && resolution.original_message_text) {
          const retriedInbound: BridgeInboundMessage = {
            ...inbound,
            text: resolution.original_message_text,
            callbackData: undefined,
          };
          await handleInboundMessage(adapter, retriedInbound);
        }
        if (typeof inbound.updateId === "number") {
          adapter.acknowledgeUpdate?.(inbound.updateId);
        }
        return;
      }
    }

    const cardController = isCardStreamingAdapter(adapter)
      ? adapter.getCardStreamController?.() ?? null
      : null;
    const previewCapabilities = !cardController
      ? adapter.getPreviewCapabilities?.(inbound.chatId) ?? null
      : null;
    const toolCalls: BridgeToolCallState[] = [];
    let bufferedText = "";
    let cardMessageId: string | null = null;
    let creatingCard = false;
    let cardFinalized = false;
    let cardCreatePromise: Promise<void> | null = null;
    let previewState: BridgePreviewState | null = previewCapabilities?.supported
      ? {
          draftId: Date.now(),
          lastSentText: "",
          lastSentAt: 0,
          pendingText: "",
          throttleTimer: null,
          degraded: false,
        }
      : null;

    const syncCardToolCalls = () => {
      if (!cardController || !cardMessageId || typeof cardController.updateToolCalls !== "function") {
        return;
      }
      cardController.updateToolCalls(cardMessageId, toolCalls);
    };

    const ensureCard = (initialText: string) => {
      if (!cardController || cardMessageId || creatingCard) {
        return;
      }

      creatingCard = true;
      cardCreatePromise = (async () => {
        const nextMessageId = await cardController.create(
          inbound.chatId,
          initialText,
          inbound.messageId,
        );
        cardMessageId = nextMessageId || null;
        creatingCard = false;

        if (!cardMessageId) {
          return;
        }

        if (bufferedText && bufferedText !== initialText) {
          await cardController.update(cardMessageId, bufferedText).catch(() => {});
        }
        syncCardToolCalls();
      })().catch(() => {
        creatingCard = false;
      });
    };

    const streamCallbacks: ThreadStreamCallbacks | undefined = cardController
      ? {
          onText: (text) => {
            bufferedText = text;
            if (!cardMessageId) {
              ensureCard(text);
              return;
            }
            void cardController.update(cardMessageId, text).catch(() => {});
          },
          onToolEvent: (event) => {
            upsertToolCallState(toolCalls, event);
            if (!cardMessageId && !creatingCard) {
              ensureCard("");
              return;
            }
            syncCardToolCalls();
          },
        }
      : previewState
        ? {
            onText: (text) => {
              if (!previewState || previewState.degraded) {
                return;
              }
              previewState.pendingText = text;
              const delta = text.length - previewState.lastSentText.length;
              const elapsed = Date.now() - previewState.lastSentAt;

              if (delta < 20 && previewState.lastSentAt > 0) {
                if (!previewState.throttleTimer) {
                  previewState.throttleTimer = setTimeout(() => {
                    previewState!.throttleTimer = null;
                    void flushPreview(adapter, inbound.chatId, previewState!);
                  }, 700);
                }
                return;
              }

              if (elapsed < 700 && previewState.lastSentAt > 0) {
                if (!previewState.throttleTimer) {
                  previewState.throttleTimer = setTimeout(() => {
                    previewState!.throttleTimer = null;
                    void flushPreview(adapter, inbound.chatId, previewState!);
                  }, 700 - elapsed);
                }
                return;
              }

              if (previewState.throttleTimer) {
                clearTimeout(previewState.throttleTimer);
                previewState.throttleTimer = null;
              }
              void flushPreview(adapter, inbound.chatId, previewState);
            },
          }
        : undefined;

    adapter.onMessageStart?.(inbound.chatId);

    try {
      if (inbound.text) {
        const dangerCheck = isDangerousInput(inbound.text);
        if (dangerCheck.dangerous) {
          await deliverOutboundText(
            adapter,
            inbound,
            binding,
            `Request rejected: ${dangerCheck.reason || "dangerous input detected"}.`,
          );
          return;
        }
      }

      if (inbound.attachments?.length) {
        await threadClient.uploadFiles(
          binding.threadId,
          inbound.attachments.map((attachment) => ({
            name: attachment.name,
            type: attachment.type,
            data: attachment.data,
          })),
        );
      }

      const sanitized = sanitizeInput(inbound.text || (inbound.attachments?.length ? "Please inspect the uploaded files." : ""));
      const result = await threadClient.streamMessage(
        binding.threadId,
        sanitized.text,
        streamCallbacks,
      );

      const pendingCardCreate = cardCreatePromise;
      if (pendingCardCreate) {
        await pendingCardCreate;
      }

      if (cardController && cardMessageId) {
        const clarificationText = !result.finalText ? extractClarificationText(result.events) : "";
        await finalizeCardStream(
          cardController,
          cardMessageId,
          result.finalText || clarificationText || bufferedText || " ",
          "completed",
        );
        cardFinalized = true;
        return;
      }

      const permissionRequest = !result.finalText ? extractPermissionRequest(result.events) : null;
      const clarificationRequest = !result.finalText ? extractClarificationRequest(result.events) : null;
      const clarificationText = !result.finalText ? extractClarificationText(result.events) : "";
      if (result.finalText || clarificationText || permissionRequest) {
        const supportsPermissionButtons = ["telegram", "discord"].includes(adapter.platform);
        const clarificationButtons =
          clarificationRequest &&
          adapter.platform === "telegram" &&
          clarificationRequest.options.length > 0 &&
          clarificationRequest.options.every((option: string) => option.length <= 60)
            ? {
                inlineButtons: [
                  clarificationRequest.options.map((option: string) => ({
                    text: option,
                    callbackData: option,
                  })),
                ],
              }
            : undefined;
        const permissionButtons =
          permissionRequest &&
          supportsPermissionButtons &&
          permissionRequest.id
            ? {
                inlineButtons: [[
                  { text: "Allow", callbackData: `perm:allow:${permissionRequest.id}` },
                  { text: "Allow Session", callbackData: `perm:allow_session:${permissionRequest.id}` },
                  { text: "Deny", callbackData: `perm:deny:${permissionRequest.id}` },
                ]],
              }
            : undefined;
        await deliverOutboundText(
          adapter,
          inbound,
          binding,
          result.finalText
            || clarificationText
            || (permissionRequest
              ? formatPermissionPrompt({
                  ...permissionRequest,
                  supportsButtons: supportsPermissionButtons,
                })
              : "")
            || formatClarificationPrompt(clarificationRequest || { question: "", context: "", options: [] }),
          permissionButtons ?? clarificationButtons,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Bridge message processing failed";

      const pendingCardCreate = cardCreatePromise;
      if (pendingCardCreate) {
        await pendingCardCreate;
      }

      if (cardController && cardMessageId) {
        await finalizeCardStream(cardController, cardMessageId, `❌ Error: ${message}`, "error");
        cardFinalized = true;
        return;
      }

      await deliverOutboundText(adapter, inbound, binding, `Error: ${message}`);
    } finally {
      if (previewState?.throttleTimer) {
        clearTimeout(previewState.throttleTimer);
        previewState.throttleTimer = null;
      }
      if (previewState) {
        adapter.endPreview?.(inbound.chatId, previewState.draftId);
      }
      if (cardController && !cardFinalized) {
        const pendingCardCreate = cardCreatePromise;
        if (pendingCardCreate) {
          await pendingCardCreate;
        }
        if (cardMessageId) {
          await finalizeCardStream(
            cardController,
            cardMessageId,
            "⚠️ Response interrupted.",
            "interrupted",
          ).catch(() => {});
        }
      }

      if (typeof inbound.updateId === "number") {
        adapter.acknowledgeUpdate?.(inbound.updateId);
      }
      adapter.onMessageEnd?.(inbound.chatId);
    }
  };

  const runAdapterLoop = async (adapter: BaseBridgeAdapter) => {
    while (running) {
      try {
        const inbound = await adapter.consumeOne();
        if (!running) {
          break;
        }
        if (!inbound) {
          continue;
        }
        await handleInboundMessage(adapter, inbound);
      } catch (error) {
        if (!running) {
          break;
        }
        console.error(`[bridge-manager] ${adapter.platform} loop failed`, error);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  };

  return {
    start: async () => {
      if (running) {
        return;
      }

      const candidates = startableAdapters();
      if (candidates.length === 0) {
        running = false;
        startedAt = null;
        return;
      }

      const startedAdapters: BaseBridgeAdapter[] = [];
      for (const adapter of candidates) {
        try {
          await adapter.start();
          startedAdapters.push(adapter);
        } catch (error) {
          console.error(`[bridge-manager] failed to start ${adapter.platform}`, error);
        }
      }

      if (startedAdapters.length === 0) {
        running = false;
        startedAt = null;
        return;
      }

      running = true;
      startedAt = new Date().toISOString();

      for (const adapter of startedAdapters) {
        const task = runAdapterLoop(adapter);
        loopTasks.set(adapter.platform, task);
      }
    },
    stop: async () => {
      if (!running && loopTasks.size === 0) {
        await Promise.all(resolveAdapters().map((adapter) => adapter.stop()));
        return;
      }

      running = false;
      const tasks = [...loopTasks.values()];
      loopTasks.clear();

      await Promise.allSettled(resolveAdapters().map((adapter) => adapter.stop()));
      await Promise.allSettled(tasks);
      startedAt = null;
    },
    getStatus: (): DesktopBridgeStatus => ({
      running,
      enabledPlatforms: enabledPlatformsFromSettings(),
      adapters: resolveAdapters().map((adapter) => {
        const status = adapter.getStatus();
        return {
          ...status,
          connectedAt: status.running ? status.connectedAt ?? startedAt : null,
        };
      }),
    }),
    probePlatform: async (platform: string) => {
      const adapter = resolveAdapters().find((item) => item.platform === platform);
      if (!adapter) {
        return { ok: false, message: `${platform} adapter is unavailable` };
      }
      return adapter.probe();
    },
    resolveBindingForAddress: (address: BridgeAddress) => router.resolveBinding(address),
    getThreadClient: () => threadClient,
    processNextInboundMessage: async () => {
      for (const adapter of resolveAdapters()) {
        const inbound = await adapter.consumeOne();
        if (!inbound) {
          continue;
        }
        await handleInboundMessage(adapter, inbound);
        return true;
      }
      return false;
    },
  };
}
