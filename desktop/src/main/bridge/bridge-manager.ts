import type {
  DesktopBridgeObservationLevel,
  DesktopBridgeObservationType,
  DesktopBridgeStatus,
} from "../../shared/bridge-ipc.js";
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

type BridgeObservationInput = {
  observationType: DesktopBridgeObservationType;
  level: DesktopBridgeObservationLevel;
  adapterPlatform: string | null;
  bindingId: string | null;
  threadId: string | null;
  summary: string;
  details: Record<string, unknown>;
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
  clientId?: string;
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
  recordObservation?: (observation: BridgeObservationInput) => void;
}) {
  const adapters = options.adapters ?? [];
  let running = false;
  let startedAt: string | null = null;
  let resolvedAdapters: BaseBridgeAdapter[] | null = null;
  const loopTasks = new Map<string, Promise<void>>();
  const activeTasks = new Map<string, AbortController>();
  const sessionLocks = new Map<string, Promise<void>>();
  const adapterMeta = new Map<
    string,
    { lastMessageAt: string | null; lastError: string | null }
  >();
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
    loadSettings: () => options.loadSettings().settings,
    defaultWorkingDirectory: options.defaultWorkingDirectory ?? (() => ""),
  });
  const threadClient =
    options.threadClient ??
    createNionThreadClient(options.backendBaseUrl ?? "http://127.0.0.1:43115", {
      clientId: options.clientId,
    });
  const recordObservation = (observation: BridgeObservationInput) => {
    options.recordObservation?.(observation);
  };
  const listBindings = options.listBindings ?? (() => []);
  const upsertBinding =
    options.upsertBinding ??
    ((binding: Omit<BridgeBinding, "id" | "createdAt" | "updatedAt">) => ({
      ...binding,
      id: "stub-binding",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

  const getAdapterMeta = (platform: string) => {
    let meta = adapterMeta.get(platform);
    if (!meta) {
      meta = { lastMessageAt: null, lastError: null };
      adapterMeta.set(platform, meta);
    }
    return meta;
  };

  const defaultBindingValues = () => {
    return {
      workingDirectory: options.defaultWorkingDirectory?.() ?? "",
      model: "",
      mode: "code",
    } satisfies Pick<BridgeBinding, "workingDirectory" | "model" | "mode">;
  };

  const findBindingForAddress = (address: BridgeAddress) =>
    listBindings().find(
      (binding) => binding.platform === address.platform && binding.chatId === address.chatId,
    ) ?? null;

  const createNewBinding = (
    address: BridgeAddress,
    overrides?: Partial<Pick<BridgeBinding, "workingDirectory" | "model" | "mode" | "threadId">>,
  ) => {
    const defaults = defaultBindingValues();
    return upsertBinding({
      platform: address.platform,
      chatId: address.chatId,
      threadId:
        overrides?.threadId ??
        `bridge-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`,
      workingDirectory: overrides?.workingDirectory ?? defaults.workingDirectory,
      model: overrides?.model ?? defaults.model,
      mode: overrides?.mode ?? defaults.mode,
      active: true,
    });
  };

  const updateBindingById = (
    bindingId: string,
    updates: Partial<Pick<BridgeBinding, "threadId" | "workingDirectory" | "model" | "mode" | "active">>,
  ) => {
    const existing = listBindings().find((binding) => binding.id === bindingId);
    if (!existing) {
      return null;
    }
    return upsertBinding({
      ...existing,
      ...updates,
    });
  };

  const processWithSessionLock = (sessionId: string, fn: () => Promise<void>) => {
    const previous = sessionLocks.get(sessionId) ?? Promise.resolve();
    const current = previous.then(fn, fn);
    sessionLocks.set(sessionId, current);
    current.finally(() => {
      if (sessionLocks.get(sessionId) === current) {
        sessionLocks.delete(sessionId);
      }
    });
    return current;
  };

  const isCommandMessage = (inbound: BridgeInboundMessage) =>
    Boolean(inbound.callbackData) ||
    (typeof inbound.text === "string" && inbound.text.trim().startsWith("/"));

  const validateWorkingDirectory = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (!trimmed.startsWith("/") || trimmed.includes("\0")) {
      return null;
    }
    if (trimmed.split("/").includes("..")) {
      return null;
    }
    return trimmed;
  };

  const formatBindingStatus = (binding: BridgeBinding) =>
    [
      "<b>Bridge Status</b>",
      "",
      `Session: <code>${binding.threadId}</code>`,
      `CWD: <code>${binding.workingDirectory || "~"}</code>`,
      `Mode: <b>${binding.mode || "code"}</b>`,
      `Model: <code>${binding.model || "default"}</code>`,
    ].join("\n");

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

  const startableAdapters = () => {
    const validAdapters = resolveAdapters().filter((adapter) => adapter.validateConfig() === null);
    if (adapters.length > 0) {
      return validAdapters;
    }
    const enabled = new Set(enabledPlatformsFromSettings());
    return validAdapters.filter((adapter) => enabled.has(adapter.platform));
  };

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
    extra?: Pick<BridgeOutboundMessage, "inlineButtons" | "parseMode">,
  ) => {
    await deliverBridgeMessage(adapter, {
      platform: inbound.platform,
      chatId: inbound.chatId,
      text,
      threadId: binding.threadId,
      replyToMessageId: inbound.messageId,
      ...(extra ?? {}),
    }, {
      bindingId: binding.id,
      threadId: binding.threadId,
      recordObservation,
    });
  };

  const hydrateBridgeThreadState = async (
    threadId: string,
    binding: BridgeBinding,
  ) => {
    const labelByPlatform: Record<string, string> = {
      telegram: "Telegram",
      feishu: "Feishu",
      discord: "Discord",
      qq: "QQ",
      weixin: "Weixin",
    };
    await threadClient.ensureThreadState?.(threadId, {
      bridge: {
        source: "bridge",
        platform: binding.platform,
        label: labelByPlatform[binding.platform] ?? binding.platform,
        chatId: binding.chatId,
      },
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

  const handleCommand = async (
    adapter: BaseBridgeAdapter,
    inbound: BridgeInboundMessage,
    rawText: string,
    binding: BridgeBinding,
  ) => {
    const [command, ...argParts] = rawText.trim().split(/\s+/);
    const args = argParts.join(" ").trim();

    switch (command) {
      case "/start":
      case "/help": {
        await deliverOutboundText(
          adapter,
          inbound,
          binding,
          [
            "<b>Nion Bridge</b>",
            "",
            "Commands:",
            "/new [absolute_path]",
            "/bind <thread_id>",
            "/cwd [absolute_path]",
            "/mode code|plan|ask",
            "/status",
            "/sessions",
            "/stop",
          ].join("\n"),
          { parseMode: "HTML" },
        );
        return true;
      }
      case "/new": {
        const nextDirectory = args ? validateWorkingDirectory(args) : binding.workingDirectory;
        if (args && !nextDirectory) {
          await deliverOutboundText(
            adapter,
            inbound,
            binding,
            "Invalid path. Use an absolute path without traversal segments.",
          );
          return true;
        }
        const created = createNewBinding(
          { platform: inbound.platform, chatId: inbound.chatId, userId: inbound.userId },
          {
            workingDirectory: nextDirectory ?? "",
            model: binding.model,
            mode: binding.mode,
          },
        );
        await deliverOutboundText(
          adapter,
          inbound,
          created,
          `New session created.\nSession: <code>${created.threadId}</code>\nCWD: <code>${created.workingDirectory || "~"}</code>`,
          { parseMode: "HTML" },
        );
        return true;
      }
      case "/bind": {
        if (!args) {
          await deliverOutboundText(adapter, inbound, binding, "Usage: /bind <thread_id>");
          return true;
        }
        const existingThread = await threadClient.searchThread?.(args);
        if (!existingThread) {
          await deliverOutboundText(adapter, inbound, binding, "Session not found.");
          return true;
        }
        const rebound =
          updateBindingById(binding.id, { threadId: args, active: true }) ?? binding;
        await deliverOutboundText(
          adapter,
          inbound,
          rebound,
          `Bound to session <code>${args}</code>`,
          { parseMode: "HTML" },
        );
        return true;
      }
      case "/cwd": {
        if (!args) {
          const current = updateBindingById(binding.id, {}) ?? binding;
          const recentDirs = [...new Set(
            listBindings()
              .filter((candidate) => candidate.platform === inbound.platform && candidate.active)
              .map((candidate) => candidate.workingDirectory)
              .filter(Boolean),
          )].slice(0, 8);

          if (recentDirs.length === 0) {
            await deliverOutboundText(
              adapter,
              inbound,
              current,
              `Current working directory: <code>${current.workingDirectory || "~"}</code>\nUsage: /cwd /absolute/path`,
              { parseMode: "HTML" },
            );
            return true;
          }

          const supportsButtons = adapter.platform === "telegram" || adapter.platform === "discord";
          await deliverOutboundText(
            adapter,
            inbound,
            current,
            [
              "<b>Switch Working Directory</b>",
              "",
              `Current: <code>${current.workingDirectory || "~"}</code>`,
              "",
              supportsButtons
                ? "Select a project below."
                : `Recent projects:\n${recentDirs.map((dir) => `- ${dir}`).join("\n")}`,
            ].join("\n"),
              supportsButtons
                ? {
                  inlineButtons: recentDirs.map((dir) => [
                    {
                      text:
                        dir === current.workingDirectory
                          ? `📍 ${dir.split("/").filter(Boolean).pop() || dir}`
                          : dir.split("/").filter(Boolean).pop() || dir,
                      callbackData: `cwd:${dir}`,
                    },
                  ]),
                  parseMode: "HTML",
                }
              : undefined,
          );
          return true;
        }

        const nextDirectory = validateWorkingDirectory(args);
        if (!nextDirectory) {
          await deliverOutboundText(
            adapter,
            inbound,
            binding,
            "Invalid path. Use an absolute path without traversal segments.",
          );
          return true;
        }
        const updated =
          updateBindingById(binding.id, { workingDirectory: nextDirectory }) ?? binding;
        await deliverOutboundText(
          adapter,
          inbound,
          updated,
          `Working directory set to <code>${nextDirectory}</code>`,
          { parseMode: "HTML" },
        );
        return true;
      }
      case "/mode": {
        if (args !== "code" && args !== "plan" && args !== "ask") {
          await deliverOutboundText(adapter, inbound, binding, "Usage: /mode code|plan|ask");
          return true;
        }
        const updated = updateBindingById(binding.id, {
          mode: args,
        }) ?? binding;
        await deliverOutboundText(adapter, inbound, updated, `Mode set to <b>${args}</b>`);
        return true;
      }
      case "/status": {
        await deliverOutboundText(adapter, inbound, binding, formatBindingStatus(binding), {
          parseMode: "HTML",
        });
        return true;
      }
      case "/sessions": {
        const bindings = listBindings()
          .filter((candidate) => candidate.platform === inbound.platform)
          .slice(0, 10);
        const lines =
          bindings.length === 0
            ? ["No sessions found."]
            : [
                "<b>Sessions:</b>",
                "",
                ...bindings.map((candidate) =>
                  `<code>${candidate.threadId}</code> [${candidate.active ? "active" : "inactive"}] ${candidate.workingDirectory || "~"}`,
                ),
              ];
        await deliverOutboundText(adapter, inbound, binding, lines.join("\n"), {
          parseMode: "HTML",
        });
        return true;
      }
      case "/stop": {
        const taskAbort = activeTasks.get(binding.threadId);
        if (taskAbort) {
          taskAbort.abort();
          activeTasks.delete(binding.threadId);
          await deliverOutboundText(adapter, inbound, binding, "Stopping current task...");
        } else {
          await deliverOutboundText(adapter, inbound, binding, "No task is currently running.");
        }
        return true;
      }
      default:
        return false;
    }
  };

  const handleInboundMessage = async (
    adapter: BaseBridgeAdapter,
    inbound: BridgeInboundMessage,
  ) => {
    const resolvedBinding = router.resolveBinding({
      platform: inbound.platform,
      chatId: inbound.chatId,
      userId: inbound.userId,
    });
    const defaults = defaultBindingValues();
    const binding =
      !resolvedBinding.model || !resolvedBinding.mode || !resolvedBinding.workingDirectory
        ? updateBindingById(resolvedBinding.id, {
            model: resolvedBinding.model || defaults.model,
            mode: resolvedBinding.mode || defaults.mode,
            workingDirectory: resolvedBinding.workingDirectory || defaults.workingDirectory,
          }) ?? {
            ...resolvedBinding,
            model: resolvedBinding.model || defaults.model,
            mode: resolvedBinding.mode || defaults.mode,
            workingDirectory:
              resolvedBinding.workingDirectory || defaults.workingDirectory,
          }
        : resolvedBinding;
    const rawText = typeof inbound.text === "string" ? inbound.text.trim() : "";

    if (typeof inbound.callbackData === "string" && inbound.callbackData.startsWith("cwd:")) {
      const nextDirectory = validateWorkingDirectory(inbound.callbackData.slice(4));
      if (nextDirectory) {
        const updated =
          updateBindingById(binding.id, { workingDirectory: nextDirectory }) ?? binding;
        await deliverOutboundText(
          adapter,
          inbound,
          updated,
          `Working directory switched to <code>${nextDirectory}</code>`,
        );
      }
      if (typeof inbound.updateId === "number") {
        adapter.acknowledgeUpdate?.(inbound.updateId);
      }
      return;
    }

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

    if (rawText.startsWith("/")) {
      const handled = await handleCommand(adapter, inbound, rawText, binding);
      if (handled) {
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

    const taskAbort = new AbortController();
    activeTasks.set(binding.threadId, taskAbort);

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
      await hydrateBridgeThreadState(binding.threadId, binding);
      const result = await threadClient.streamMessage(
        binding.threadId,
        sanitized.text,
        streamCallbacks,
        {
          modelName: binding.model || undefined,
          planMode: binding.mode === "plan",
          signal: taskAbort.signal,
        },
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
      if (
        (error instanceof Error && error.name === "AbortError") ||
        (error instanceof Error && /aborted/i.test(error.message))
      ) {
        const pendingCardCreate = cardCreatePromise;
        if (pendingCardCreate) {
          await pendingCardCreate;
        }

        if (cardController && cardMessageId) {
          await finalizeCardStream(
            cardController,
            cardMessageId,
            "⚠️ Task interrupted.",
            "interrupted",
          );
          cardFinalized = true;
          return;
        }

        await deliverOutboundText(adapter, inbound, binding, "Task interrupted.");
        return;
      }

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
      activeTasks.delete(binding.threadId);
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
        const meta = getAdapterMeta(adapter.platform);
        meta.lastMessageAt = new Date().toISOString();
        meta.lastError = null;

        if (isCommandMessage(inbound)) {
          await handleInboundMessage(adapter, inbound);
          continue;
        }

        const binding = router.resolveBinding({
          platform: inbound.platform,
          chatId: inbound.chatId,
          userId: inbound.userId,
        });

        void processWithSessionLock(binding.threadId, async () => {
          await handleInboundMessage(adapter, inbound);
        }).catch((error) => {
          const currentMeta = getAdapterMeta(adapter.platform);
          currentMeta.lastError = error instanceof Error ? error.message : String(error);
          console.error(
            `[bridge-manager] session ${binding.threadId} failed on ${adapter.platform}`,
            error,
          );
        });
      } catch (error) {
        if (!running) {
          break;
        }
        const meta = getAdapterMeta(adapter.platform);
        meta.lastError = error instanceof Error ? error.message : String(error);
        recordObservation({
          observationType: "adapter_runtime_error",
          level: "error",
          adapterPlatform: adapter.platform,
          bindingId: null,
          threadId: null,
          summary: `${adapter.platform} adapter runtime loop failed`,
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
        console.error(`[bridge-manager] ${adapter.platform} loop failed`, error);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  };

  return {
    start: async (): Promise<string | null> => {
      if (running) {
        return null;
      }

      const settings = options.loadSettings().settings;
      if (settings.remote_bridge_enabled !== "true") {
        running = false;
        startedAt = null;
        return "bridge_not_enabled";
      }

      const candidates = startableAdapters();
      if (candidates.length === 0) {
        running = false;
        startedAt = null;
        return "no_channels_enabled";
      }

      const startedAdapters: BaseBridgeAdapter[] = [];
      let invalidAdapterConfig = false;
      for (const adapter of candidates) {
        try {
          await adapter.start();
          startedAdapters.push(adapter);
        } catch (error) {
          invalidAdapterConfig = true;
          recordObservation({
            observationType: "adapter_start_failed",
            level: "error",
            adapterPlatform: adapter.platform,
            bindingId: null,
            threadId: null,
            summary: `${adapter.platform} adapter failed to start`,
            details: {
              error: error instanceof Error ? error.message : String(error),
            },
          });
          console.error(`[bridge-manager] failed to start ${adapter.platform}`, error);
        }
      }

      if (startedAdapters.length === 0) {
        running = false;
        startedAt = null;
        return invalidAdapterConfig ? "adapter_config_invalid" : "no_adapters_started";
      }

      running = true;
      startedAt = new Date().toISOString();
      recordObservation({
        observationType: "bridge_manager_started",
        level: "info",
        adapterPlatform: null,
        bindingId: null,
        threadId: null,
        summary: "Bridge manager started",
        details: {
          enabledPlatforms: enabledPlatformsFromSettings(),
          activeAdapters: startedAdapters.map((adapter) => adapter.platform),
        },
      });

      for (const adapter of startedAdapters) {
        const task = runAdapterLoop(adapter);
        loopTasks.set(adapter.platform, task);
      }

      return null;
    },
    startPlatform: async (platform: string): Promise<string | null> => {
      const settings = options.loadSettings().settings;
      if (settings.remote_bridge_enabled !== "true") {
        return "bridge_not_enabled";
      }

      if (settings[`bridge_${platform}_enabled`] !== "true") {
        return "channel_not_enabled";
      }

      const adapter = resolveAdapters().find((item) => item.platform === platform);
      if (!adapter) {
        return "adapter_unavailable";
      }

      const validation = adapter.validateConfig();
      if (validation) {
        return `adapter_config_invalid:${validation}`;
      }

      if (loopTasks.has(platform) && adapter.getStatus().running) {
        return null;
      }

      try {
        await adapter.start();
      } catch (error) {
        recordObservation({
          observationType: "adapter_start_failed",
          level: "error",
          adapterPlatform: adapter.platform,
          bindingId: null,
          threadId: null,
          summary: `${adapter.platform} adapter failed to start`,
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
        return `adapter_config_invalid:${error instanceof Error ? error.message : String(error)}`;
      }

      if (!running) {
        running = true;
        startedAt = new Date().toISOString();
      }

      const task = runAdapterLoop(adapter);
      loopTasks.set(adapter.platform, task);
      return null;
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
      for (const abort of activeTasks.values()) {
        abort.abort();
      }
      activeTasks.clear();
      sessionLocks.clear();
      recordObservation({
        observationType: "bridge_manager_stopped",
        level: "info",
        adapterPlatform: null,
        bindingId: null,
        threadId: null,
        summary: "Bridge manager stopped",
        details: {
          enabledPlatforms: enabledPlatformsFromSettings(),
        },
      });
      startedAt = null;
    },
    stopPlatform: async (platform: string) => {
      const adapter = resolveAdapters().find((item) => item.platform === platform);
      if (!adapter) {
        return;
      }

      await adapter.stop();
      loopTasks.delete(platform);
      activeTasks.forEach((controller, threadId) => {
        const binding = listBindings().find((item) => item.threadId === threadId);
        if (binding?.platform === platform) {
          controller.abort();
          activeTasks.delete(threadId);
        }
      });

      const anyRunning = resolveAdapters().some((item) => item.getStatus().running);
      if (!anyRunning) {
        running = false;
        startedAt = null;
      }
    },
    getStatus: (): DesktopBridgeStatus => ({
      running,
      startedAt,
      enabledPlatforms: enabledPlatformsFromSettings(),
      adapters: resolveAdapters().filter((adapter) => {
        const enabled = enabledPlatformsFromSettings().includes(adapter.platform);
        return enabled || adapter.getStatus().running;
      }).map((adapter) => {
        const status = adapter.getStatus();
        const meta = getAdapterMeta(adapter.platform);
        return {
          ...status,
          channelType: status.platform,
          connectedAt: status.running ? status.connectedAt ?? startedAt : null,
          lastMessageAt: meta.lastMessageAt,
          error: status.error ?? meta.lastError,
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
    reloadAdapters: () => {
      resolvedAdapters = null;
    },
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
