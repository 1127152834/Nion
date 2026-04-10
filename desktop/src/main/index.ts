import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, dialog, ipcMain } from "electron";

import { createBridgeActionRunner } from "./bridge/action-runner.js";
import { createBridgeManager } from "./bridge/bridge-manager.js";
import { createBridgeBindingsStore } from "./bridge/bindings-store.js";
import { createBridgeIncidentController } from "./bridge/incident-playbooks.js";
import { createBridgeIncidentsStore } from "./bridge/incidents-store.js";
import { createBridgeObservationsStore } from "./bridge/observations-store.js";
import { createBridgeOffsetStore } from "./bridge/offset-store.js";
import { createWeixinAuthManager } from "./bridge/weixin/auth.js";
import { createWeixinBridgeStore } from "./bridge/weixin-store.js";
import { createElectronClientSession, type ElectronClientSession } from "./daemon-client-session.js";
import { ensureLocalDaemon } from "./daemon-launcher.js";
import { buildDaemonCommand, resolveDesktopEnvironment } from "./config.js";
import { shouldAutoStartDesktopMain } from "./entrypoint.js";
import { registerDesktopProtocol } from "./protocol.js";
import { shouldKeepPrimaryInstance } from "./single-instance.js";
import { createDesktopUpdater, registerUpdaterHandlers } from "./updater.js";
import { createMainWindow, focusMainWindow } from "./window.js";
import { TerminalManager } from "./terminal-manager.js";
import { DESKTOP_BRIDGE_IPC_CHANNELS } from "../shared/bridge-ipc.js";
import { DESKTOP_IPC_CHANNELS } from "../shared/ipc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow: BrowserWindow | null = null;
let clientSession: ElectronClientSession | null = null;
let runtimeInfo: import("../shared/ipc.js").DesktopRuntimeInfo | null = null;
const terminalManager = new TerminalManager();

const MASKED_SETTING_KEYS = new Set([
  "bridge_discord_bot_token",
  "bridge_feishu_app_secret",
  "bridge_qq_app_secret",
]);

const BRIDGE_PLATFORM_KEYS = ["telegram", "feishu", "discord", "qq", "weixin"] as const;

type BridgePlatformKey = (typeof BRIDGE_PLATFORM_KEYS)[number];
type BridgeSettingsMap = Record<string, string>;

function maskSettingValue(key: string, value: string) {
  if (!MASKED_SETTING_KEYS.has(key) || value.length <= 8) {
    return value;
  }
  return `***${value.slice(-8)}`;
}

function getSettingWithAliases(settings: Record<string, string>, key: string) {
  if (key === "telegram_bot_token") {
    return settings.telegram_bot_token || settings.bridge_telegram_bot_token || "";
  }
  if (key === "telegram_chat_id") {
    return settings.telegram_chat_id || settings.bridge_telegram_chat_id || "";
  }
  return settings[key] ?? "";
}

function bridgeVerifiedKey(platform: BridgePlatformKey) {
  return `bridge_${platform}_verified`;
}

function bridgeVerifiedAtKey(platform: BridgePlatformKey) {
  return `bridge_${platform}_verified_at`;
}

function bridgeVerifiedFingerprintKey(platform: BridgePlatformKey) {
  return `bridge_${platform}_verified_fingerprint`;
}

function normalizeFingerprintValue(value: string) {
  return value.trim();
}

function computeBridgeVerificationFingerprint(
  platform: BridgePlatformKey,
  settings: Record<string, string>,
) {
  switch (platform) {
    case "telegram":
      return JSON.stringify({
        botToken: getSettingWithAliases(settings, "telegram_bot_token"),
        chatId: getSettingWithAliases(settings, "telegram_chat_id"),
      });
    case "feishu":
      return JSON.stringify({
        appId: settings.bridge_feishu_app_id || "",
        appSecret: settings.bridge_feishu_app_secret || "",
        domain: settings.bridge_feishu_domain || "feishu",
      });
    case "discord":
      return JSON.stringify({
        botToken: settings.bridge_discord_bot_token || "",
      });
    case "qq":
      return JSON.stringify({
        appId: settings.bridge_qq_app_id || "",
        appSecret: settings.bridge_qq_app_secret || "",
      });
    case "weixin":
      return "managed-by-weixin-accounts";
  }
}

function clearBridgeVerificationState(
  settings: Record<string, string>,
  platform: BridgePlatformKey,
) {
  settings[bridgeVerifiedKey(platform)] = "";
  settings[bridgeVerifiedAtKey(platform)] = "";
  settings[bridgeVerifiedFingerprintKey(platform)] = "";
  settings[`bridge_${platform}_enabled`] = "";
}

function markBridgeVerificationState(
  settings: Record<string, string>,
  platform: BridgePlatformKey,
) {
  settings[bridgeVerifiedKey(platform)] = "true";
  settings[bridgeVerifiedAtKey(platform)] = new Date().toISOString();
  settings[bridgeVerifiedFingerprintKey(platform)] = computeBridgeVerificationFingerprint(platform, settings);
}

async function callTelegramApi(
  botToken: string,
  method: string,
  params: Record<string, unknown>,
) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await response.json()) as {
    ok?: boolean;
    result?: Record<string, unknown>;
    description?: string;
    parameters?: { retry_after?: number };
  };
  return {
    ok: data.ok === true,
    result: data.result,
    description: data.description,
    retryAfter: data.parameters?.retry_after,
  };
}

async function verifyTelegramBot(botToken: string, chatId?: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json()) as {
    ok?: boolean;
    result?: { username?: string; first_name?: string };
    description?: string;
  };
  if (!data.ok || !data.result) {
    return {
      verified: false,
      error: data.description || "Invalid bot token",
    };
  }

  const botName = data.result.username || data.result.first_name || "";
  if (chatId) {
    const sendResult = await callTelegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: `✅ CodePilot connected successfully!\n\nBot: @${botName}\nNotifications will be sent to this chat.`,
      parse_mode: "HTML",
    });
    if (!sendResult.ok) {
      return {
        verified: false,
        botName,
        error: `Bot verified but cannot send to chat: ${sendResult.description || "Unknown Telegram API error"}`,
      };
    }
  }

  return {
    verified: true,
    botName,
  };
}

async function detectTelegramChatId(botToken: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 100, timeout: 0, allowed_updates: ["message"] }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json()) as {
    ok?: boolean;
    result?: Array<{
      message?: {
        chat?: {
          id?: number | string;
          first_name?: string;
          title?: string;
          username?: string;
        };
      };
    }>;
  };

  if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
    for (let index = data.result.length - 1; index >= 0; index -= 1) {
      const chat = data.result[index]?.message?.chat;
      if (!chat?.id) {
        continue;
      }
      const chatId = String(chat.id);
      return {
        ok: true,
        chatId,
        chatTitle: chat.first_name || chat.title || chat.username || chatId,
      };
    }
  }

  return {
    ok: false,
    error: "No messages found. Please send /start to the bot first, then try again.",
  };
}

async function verifyDiscordBot(botToken: string) {
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: {
      Authorization: `Bot ${botToken}`,
    },
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    username?: string;
    discriminator?: string;
    message?: string;
  };

  if (!response.ok) {
    return {
      verified: false,
      error: data.message || `HTTP ${response.status}: Token verification failed`,
    };
  }

  if (!data.id) {
    return {
      verified: false,
      error: "Could not retrieve bot info",
    };
  }

  return {
    verified: true,
    botName: data.username ? `${data.username}#${data.discriminator || "0"}` : data.id,
  };
}

async function verifyFeishuApp(appId: string, appSecret: string, domain: string) {
  const baseUrl = domain === "lark" ? "https://open.larksuite.com" : "https://open.feishu.cn";
  const tokenResponse = await fetch(`${baseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    signal: AbortSignal.timeout(10_000),
  });
  const tokenData = (await tokenResponse.json()) as {
    tenant_access_token?: string;
    msg?: string;
  };
  if (!tokenData.tenant_access_token) {
    return {
      verified: false,
      error: tokenData.msg || "Failed to get access token",
    };
  }

  const botResponse = await fetch(`${baseUrl}/open-apis/bot/v3/info/`, {
    headers: {
      Authorization: `Bearer ${tokenData.tenant_access_token}`,
    },
    signal: AbortSignal.timeout(10_000),
  });
  const botData = (await botResponse.json()) as {
    bot?: { open_id?: string; app_name?: string };
    msg?: string;
  };
  if (!botData.bot?.open_id) {
    return {
      verified: false,
      error: botData.msg || "Could not retrieve bot info",
    };
  }

  return {
    verified: true,
    botName: botData.bot.app_name || botData.bot.open_id,
  };
}

async function verifyQqApp(appId: string, appSecret: string) {
  const tokenResponse = await fetch("https://bots.qq.com/app/getAppAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId, clientSecret: appSecret }),
    signal: AbortSignal.timeout(10_000),
  });
  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    message?: string;
  };
  if (!tokenData.access_token) {
    return {
      verified: false,
      error: tokenData.message || "Failed to get access token",
    };
  }

  const gatewayResponse = await fetch("https://api.sgroup.qq.com/gateway", {
    headers: {
      Authorization: `QQBot ${tokenData.access_token}`,
    },
    signal: AbortSignal.timeout(10_000),
  });
  const gatewayData = (await gatewayResponse.json()) as {
    url?: string;
  };
  if (!gatewayData.url) {
    return {
      verified: false,
      error: "Failed to get gateway URL",
    };
  }

  return {
    verified: true,
    gatewayUrl: gatewayData.url,
  };
}

function verifyWeixinAccounts(
  accounts: Array<{ enabled: boolean; token?: string; name?: string; accountId: string }>,
) {
  const enabledAccounts = accounts.filter((account) => account.enabled && account.token);
  if (enabledAccounts.length === 0) {
    return {
      verified: false,
      error: "No enabled Weixin accounts available",
    };
  }

  const primary = enabledAccounts[0];
  return {
    verified: true,
    botName: primary.name || primary.accountId,
  };
}

const lockAcquired = app.requestSingleInstanceLock();

if (!shouldKeepPrimaryInstance(lockAcquired)) {
  app.quit();
}

export async function startDesktopMain(): Promise<void> {
  if (!shouldKeepPrimaryInstance(lockAcquired)) {
    return;
  }

  await app.whenReady();

  const appRoot = app.isPackaged
    ? process.resourcesPath
    : path.resolve(__dirname, "..", "..", "..");

  const environment = resolveDesktopEnvironment({
    appRoot,
    resourcesPath: process.resourcesPath,
    userDataPath: app.getPath("userData"),
    platform: process.platform,
    packaged: app.isPackaged,
  });

  await registerDesktopProtocol();

  const daemonCommand = buildDaemonCommand({
    appRoot: environment.appRoot,
    resourcesPath: environment.resourcesPath,
    userDataPath: environment.userDataPath,
    platform: environment.platform,
    packaged: app.isPackaged,
  });

  process.env.NION_DESKTOP_BACKEND_URL = daemonCommand.urls.base;
  const preloadPath = path.join(__dirname, "..", "preload", "index.js");
  const rendererUrl =
    process.env.NION_DESKTOP_RENDERER_URL?.trim() || "nion://app/index.html";
  mainWindow = await createMainWindow({
    preloadPath,
    rendererUrl,
  });

  runtimeInfo = await ensureLocalDaemon(daemonCommand);
  process.env.NION_DESKTOP_BACKEND_URL = runtimeInfo.baseUrl;
  clientSession = await createElectronClientSession(runtimeInfo.baseUrl);
  runtimeInfo = {
    ...runtimeInfo,
    clientId: clientSession.clientId,
  };

  const updater = createDesktopUpdater();
  registerUpdaterHandlers(ipcMain, updater, () => {
    if (!runtimeInfo) {
      throw new Error("Desktop runtime info is unavailable");
    }
    return runtimeInfo;
  });

  terminalManager.setOnData((id, data) => {
    mainWindow?.webContents.send(DESKTOP_IPC_CHANNELS.terminalOnData, { id, data });
  });
  terminalManager.setOnExit((id, code) => {
    mainWindow?.webContents.send(DESKTOP_IPC_CHANNELS.terminalOnExit, { id, code });
  });

  ipcMain.handle(
    DESKTOP_IPC_CHANNELS.terminalCreate,
    async (_event, options: { id: string; cwd: string; cols: number; rows: number }) => {
      terminalManager.create(options.id, options);
    },
  );
  ipcMain.on(
    DESKTOP_IPC_CHANNELS.terminalWrite,
    (_event, payload: { id: string; data: string }) => {
      terminalManager.write(payload.id, payload.data);
    },
  );
  ipcMain.handle(
    DESKTOP_IPC_CHANNELS.terminalResize,
    async (_event, payload: { id: string; cols: number; rows: number }) => {
      terminalManager.resize(payload.id, payload.cols, payload.rows);
    },
  );
  ipcMain.handle(DESKTOP_IPC_CHANNELS.terminalKill, async (_event, id: string) => {
    terminalManager.kill(id);
  });

  const bridgeBindingsStore = createBridgeBindingsStore(
    path.join(environment.userDataPath, "bridge", "bindings.json"),
  );
  const bridgeOffsetStore = createBridgeOffsetStore(
    path.join(environment.userDataPath, "bridge", "offsets.json"),
  );
  const bridgeObservationsStore = createBridgeObservationsStore(
    path.join(environment.userDataPath, "bridge", "observations.json"),
  );
  const bridgeIncidentsStore = createBridgeIncidentsStore(
    path.join(environment.userDataPath, "bridge", "incidents.json"),
  );
  const weixinBridgeStore = createWeixinBridgeStore(
    path.join(environment.userDataPath, "bridge", "weixin.json"),
  );
  const weixinAuthManager = createWeixinAuthManager({
    upsertAccount: (account) => weixinBridgeStore.upsertAccount(account),
  });
  let bridgeSettingsCache: BridgeSettingsMap = {};

  const readBridgeConfigFromConfigCenter = async () => {
    if (!runtimeInfo) {
      throw new Error("Desktop runtime info is unavailable");
    }
    const response = await fetch(`${runtimeInfo.baseUrl}/api/config`);
    const payload = (await response.json()) as {
      config?: { bridge?: Record<string, unknown> };
    };
    const bridge = payload.config?.bridge;
    return bridge && typeof bridge === "object"
      ? (bridge as Record<string, unknown>)
      : {};
  };

  const bridgeConfigToSettingsMap = (bridgeConfig: Record<string, unknown>): BridgeSettingsMap => {
    const telegram =
      bridgeConfig.telegram && typeof bridgeConfig.telegram === "object"
        ? (bridgeConfig.telegram as Record<string, unknown>)
        : {};
    const feishu =
      bridgeConfig.feishu && typeof bridgeConfig.feishu === "object"
        ? (bridgeConfig.feishu as Record<string, unknown>)
        : {};
    const discord =
      bridgeConfig.discord && typeof bridgeConfig.discord === "object"
        ? (bridgeConfig.discord as Record<string, unknown>)
        : {};
    const qq =
      bridgeConfig.qq && typeof bridgeConfig.qq === "object"
        ? (bridgeConfig.qq as Record<string, unknown>)
        : {};
    const weixin =
      bridgeConfig.weixin && typeof bridgeConfig.weixin === "object"
        ? (bridgeConfig.weixin as Record<string, unknown>)
        : {};

    return {
      remote_bridge_enabled: "true",
      bridge_auto_start: bridgeConfig.auto_start ? "true" : "",
      bridge_default_work_dir: String(bridgeConfig.default_work_dir ?? ""),
      bridge_default_model: String(bridgeConfig.default_model ?? ""),
      bridge_default_provider_id: String(bridgeConfig.default_provider_id ?? ""),
      bridge_telegram_enabled: telegram.enabled ? "true" : "",
      telegram_bot_token: String(telegram.bot_token ?? ""),
      bridge_telegram_bot_token: String(telegram.bot_token ?? ""),
      telegram_chat_id: String(telegram.chat_id ?? ""),
      bridge_telegram_chat_id: String(telegram.chat_id ?? ""),
      telegram_bridge_allowed_users: String(telegram.allowed_users ?? ""),
      bridge_telegram_verified: telegram.verified ? "true" : "",
      bridge_telegram_verified_at: String(telegram.verified_at ?? ""),
      bridge_telegram_verified_fingerprint: String(telegram.verified_fingerprint ?? ""),
      bridge_feishu_enabled: feishu.enabled ? "true" : "",
      bridge_feishu_app_id: String(feishu.app_id ?? ""),
      bridge_feishu_app_secret: String(feishu.app_secret ?? ""),
      bridge_feishu_domain: String(feishu.domain ?? "feishu"),
      bridge_feishu_allow_from: String(feishu.allow_from ?? ""),
      bridge_feishu_dm_policy: String(feishu.dm_policy ?? "open"),
      bridge_feishu_thread_session: feishu.thread_session ? "true" : "false",
      bridge_feishu_group_policy: String(feishu.group_policy ?? "open"),
      bridge_feishu_group_allow_from: String(feishu.group_allow_from ?? ""),
      bridge_feishu_require_mention: feishu.require_mention ? "true" : "false",
      bridge_feishu_verified: feishu.verified ? "true" : "",
      bridge_feishu_verified_at: String(feishu.verified_at ?? ""),
      bridge_feishu_verified_fingerprint: String(feishu.verified_fingerprint ?? ""),
      bridge_discord_enabled: discord.enabled ? "true" : "",
      bridge_discord_bot_token: String(discord.bot_token ?? ""),
      bridge_discord_allowed_users: String(discord.allowed_users ?? ""),
      bridge_discord_allowed_channels: String(discord.allowed_channels ?? ""),
      bridge_discord_allowed_guilds: String(discord.allowed_guilds ?? ""),
      bridge_discord_group_policy: String(discord.group_policy ?? "open"),
      bridge_discord_require_mention: discord.require_mention ? "true" : "false",
      bridge_discord_stream_enabled: discord.stream_enabled === false ? "false" : "true",
      bridge_discord_max_attachment_size: String(discord.max_attachment_size ?? ""),
      bridge_discord_image_enabled: discord.image_enabled === false ? "false" : "true",
      bridge_discord_verified: discord.verified ? "true" : "",
      bridge_discord_verified_at: String(discord.verified_at ?? ""),
      bridge_discord_verified_fingerprint: String(discord.verified_fingerprint ?? ""),
      bridge_qq_enabled: qq.enabled ? "true" : "",
      bridge_qq_app_id: String(qq.app_id ?? ""),
      bridge_qq_app_secret: String(qq.app_secret ?? ""),
      bridge_qq_allowed_users: String(qq.allowed_users ?? ""),
      bridge_qq_image_enabled: qq.image_enabled === false ? "false" : "true",
      bridge_qq_max_image_size: String(qq.max_image_size ?? "20"),
      bridge_qq_verified: qq.verified ? "true" : "",
      bridge_qq_verified_at: String(qq.verified_at ?? ""),
      bridge_qq_verified_fingerprint: String(qq.verified_fingerprint ?? ""),
      bridge_weixin_enabled: weixin.enabled ? "true" : "",
      bridge_weixin_verified: weixin.verified ? "true" : "",
      bridge_weixin_verified_at: String(weixin.verified_at ?? ""),
      bridge_weixin_verified_fingerprint: String(weixin.verified_fingerprint ?? ""),
    } satisfies Record<string, string>;
  };

  const settingsMapToBridgeConfig = (settings: Record<string, string>) => ({
    auto_start: settings.bridge_auto_start === "true",
    default_work_dir: settings.bridge_default_work_dir || "",
    default_model: settings.bridge_default_model || "",
    default_provider_id: settings.bridge_default_provider_id || "",
    telegram: {
      enabled: settings.bridge_telegram_enabled === "true",
      verified: settings.bridge_telegram_verified === "true",
      verified_at: settings.bridge_telegram_verified_at || null,
      verified_fingerprint: settings.bridge_telegram_verified_fingerprint || "",
      bot_token: getSettingWithAliases(settings, "telegram_bot_token"),
      chat_id: getSettingWithAliases(settings, "telegram_chat_id"),
      allowed_users: settings.telegram_bridge_allowed_users || "",
    },
    feishu: {
      enabled: settings.bridge_feishu_enabled === "true",
      verified: settings.bridge_feishu_verified === "true",
      verified_at: settings.bridge_feishu_verified_at || null,
      verified_fingerprint: settings.bridge_feishu_verified_fingerprint || "",
      app_id: settings.bridge_feishu_app_id || "",
      app_secret: settings.bridge_feishu_app_secret || "",
      domain: settings.bridge_feishu_domain || "feishu",
      allow_from: settings.bridge_feishu_allow_from || "",
      dm_policy: settings.bridge_feishu_dm_policy || "open",
      thread_session: settings.bridge_feishu_thread_session === "true",
      group_policy: settings.bridge_feishu_group_policy || "open",
      group_allow_from: settings.bridge_feishu_group_allow_from || "",
      require_mention: settings.bridge_feishu_require_mention === "true",
    },
    discord: {
      enabled: settings.bridge_discord_enabled === "true",
      verified: settings.bridge_discord_verified === "true",
      verified_at: settings.bridge_discord_verified_at || null,
      verified_fingerprint: settings.bridge_discord_verified_fingerprint || "",
      bot_token: settings.bridge_discord_bot_token || "",
      allowed_users: settings.bridge_discord_allowed_users || "",
      allowed_channels: settings.bridge_discord_allowed_channels || "",
      allowed_guilds: settings.bridge_discord_allowed_guilds || "",
      group_policy: settings.bridge_discord_group_policy || "open",
      require_mention: settings.bridge_discord_require_mention === "true",
      stream_enabled: settings.bridge_discord_stream_enabled !== "false",
      max_attachment_size: settings.bridge_discord_max_attachment_size || "",
      image_enabled: settings.bridge_discord_image_enabled !== "false",
    },
    qq: {
      enabled: settings.bridge_qq_enabled === "true",
      verified: settings.bridge_qq_verified === "true",
      verified_at: settings.bridge_qq_verified_at || null,
      verified_fingerprint: settings.bridge_qq_verified_fingerprint || "",
      app_id: settings.bridge_qq_app_id || "",
      app_secret: settings.bridge_qq_app_secret || "",
      allowed_users: settings.bridge_qq_allowed_users || "",
      image_enabled: settings.bridge_qq_image_enabled !== "false",
      max_image_size: settings.bridge_qq_max_image_size || "20",
    },
    weixin: {
      enabled: settings.bridge_weixin_enabled === "true",
      verified: settings.bridge_weixin_verified === "true",
      verified_at: settings.bridge_weixin_verified_at || null,
      verified_fingerprint: settings.bridge_weixin_verified_fingerprint || "",
    },
  });

  const writeBridgeConfigToConfigCenter = async (settings: BridgeSettingsMap) => {
    if (!runtimeInfo) {
      throw new Error("Desktop runtime info is unavailable");
    }
    const readResponse = await fetch(`${runtimeInfo.baseUrl}/api/config`);
    const readPayload = (await readResponse.json()) as {
      version: string;
      config: Record<string, unknown>;
    };
    const nextConfig = {
      ...readPayload.config,
      bridge: settingsMapToBridgeConfig(settings),
    };
    const updateResponse = await fetch(`${runtimeInfo.baseUrl}/api/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: readPayload.version,
        config: nextConfig,
      }),
    });
    if (!updateResponse.ok) {
      throw new Error(`Failed to persist bridge config (${updateResponse.status})`);
    }
  };

  const migrateLegacyBridgeSettings = async () => {
    const legacyPath = path.join(environment.userDataPath, "bridge", "settings.json");
    if (!fs.existsSync(legacyPath)) {
      return;
    }

    const currentBridgeConfig = await readBridgeConfigFromConfigCenter();
    const currentSettings = bridgeConfigToSettingsMap(currentBridgeConfig);
    const hasExistingBridgeConfig = Object.values(currentSettings).some((value) => value !== "");
    if (hasExistingBridgeConfig) {
      return;
    }

    const raw = fs.readFileSync(legacyPath, "utf8");
    const parsed = JSON.parse(raw) as { settings?: Record<string, string> };
    const legacySettings =
      parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {};
    if (Object.keys(legacySettings).length === 0) {
      return;
    }

    await writeBridgeConfigToConfigCenter(legacySettings);
  };
  const bridgeManager = createBridgeManager({
    loadSettings: () => ({
      settings: bridgeSettingsCache,
      updatedAt: "",
    }),
    listBindings: () => bridgeBindingsStore.listBindings(),
    upsertBinding: (binding) => bridgeBindingsStore.upsertBinding(binding),
    defaultWorkingDirectory: () => "",
    backendBaseUrl: runtimeInfo.baseUrl,
    clientId: runtimeInfo.clientId ?? undefined,
    offsetStore: bridgeOffsetStore,
    weixinStore: weixinBridgeStore,
    recordObservation: (observation) => bridgeObservationsStore.appendObservation(observation),
  });
  const bridgeIncidentController = createBridgeIncidentController({
    getStatus: () => bridgeManager.getStatus(),
    loadSettings: () => ({
      settings: bridgeSettingsCache,
      updatedAt: "",
    }),
    listBindings: () => bridgeBindingsStore.listBindings(),
    listWeixinAccounts: () =>
      weixinBridgeStore.listAccounts().map((account) => ({
        accountId: account.accountId,
        userId: account.userId,
        name: account.name,
        enabled: account.enabled,
        hasToken: Boolean(account.token),
        lastLoginAt: account.lastLoginAt,
        createdAt: account.createdAt,
      })),
    listObservations: (filters) => bridgeObservationsStore.listObservations(filters),
    incidentStore: bridgeIncidentsStore,
  });
  const bridgeActionRunner = createBridgeActionRunner({
    incidentStore: bridgeIncidentsStore,
    restartBridgeRuntime: async () => {
      await bridgeManager.stop();
      await bridgeManager.start();
    },
    probePlatform: (platform) => bridgeManager.probePlatform(platform),
    startWeixinLogin: () => weixinAuthManager.startLogin(),
  });
  const syncBridgeSettingsCache = async () => {
    bridgeSettingsCache = bridgeConfigToSettingsMap(await readBridgeConfigFromConfigCenter());
  };
  const restoreBridgeRuntimeIfNeeded = async () => {
    await syncBridgeSettingsCache();
    if (bridgeSettingsCache.bridge_auto_start !== "true") {
      return;
    }
    bridgeManager.reloadAdapters();
    await bridgeManager.start();
  };
  const restartBridgeIfRunning = async () => {
    if (!bridgeManager.getStatus().running) {
      return;
    }
    await syncBridgeSettingsCache();
    bridgeManager.reloadAdapters();
    await bridgeManager.stop();
    await bridgeManager.start();
  };

  await migrateLegacyBridgeSettings();

  const readBridgeSettings = () => {
    return readBridgeConfigFromConfigCenter().then((bridgeConfig) => {
      const settings = bridgeConfigToSettingsMap(bridgeConfig);
      bridgeSettingsCache = settings;
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(settings)) {
        result[key] = maskSettingValue(key, value);
      }
      const telegramBotToken = getSettingWithAliases(settings, "telegram_bot_token");
      if (telegramBotToken) {
        result.telegram_bot_token = telegramBotToken;
        result.bridge_telegram_bot_token = telegramBotToken;
      }
      const telegramChatId = getSettingWithAliases(settings, "telegram_chat_id");
      if (telegramChatId) {
        result.telegram_chat_id = telegramChatId;
      }
      return result;
    });
  };

  const updateBridgeSettings = async (mutator: (settings: BridgeSettingsMap) => void) => {
    const current = bridgeConfigToSettingsMap(await readBridgeConfigFromConfigCenter());
    const next = { ...current };
    mutator(next);
    bridgeSettingsCache = next;
    await writeBridgeConfigToConfigCenter(next);
  };

  const updatePlatformVerificationState = async (
    platform: BridgePlatformKey,
    verified: boolean,
  ) => {
    await updateBridgeSettings((settings) => {
      if (!verified) {
        clearBridgeVerificationState(settings, platform);
        return;
      }
      markBridgeVerificationState(settings, platform);
    });
  };

  const persistBridgeSettings = async (updates: BridgeSettingsMap) => {
    const current = bridgeConfigToSettingsMap(await readBridgeConfigFromConfigCenter());
    const next: BridgeSettingsMap = { ...current };

    for (const [key, value] of Object.entries(updates)) {
      const nextValue = String(value ?? "").trim();
      if (MASKED_SETTING_KEYS.has(key) && nextValue.startsWith("***")) {
        continue;
      }

      next[key] = nextValue;
      if (key === "telegram_bot_token" || key === "bridge_telegram_bot_token") {
        next.telegram_bot_token = nextValue;
        next.bridge_telegram_bot_token = nextValue;
      }
      if (key === "telegram_chat_id" || key === "bridge_telegram_chat_id") {
        next.telegram_chat_id = nextValue;
        next.bridge_telegram_chat_id = nextValue;
      }
    }

    for (const platform of BRIDGE_PLATFORM_KEYS) {
      const previousFingerprint = computeBridgeVerificationFingerprint(platform, current);
      const nextFingerprint = computeBridgeVerificationFingerprint(platform, next);
      if (
        normalizeFingerprintValue(previousFingerprint) !==
        normalizeFingerprintValue(nextFingerprint)
      ) {
        clearBridgeVerificationState(next, platform);
      }
    }

    bridgeSettingsCache = next;
    await writeBridgeConfigToConfigCenter(next);
  };

  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.getSettings, async () => {
    return readBridgeSettings();
  });
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.saveSettings,
    async (_event, updates: Record<string, string>) => {
      await persistBridgeSettings(updates);
      bridgeManager.reloadAdapters();
      if (bridgeManager.getStatus().running) {
        await restartBridgeIfRunning();
      }
    },
  );
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.getStatus, () => {
    return bridgeManager.getStatus();
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.listBindings, () => {
    return bridgeBindingsStore.listBindings();
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.listIncidents, (_event, filters) => {
    return bridgeIncidentController.listIncidents(filters);
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.getIncident, (_event, incidentId: string) => {
    return bridgeIncidentController.getIncident(incidentId);
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.diagnose, (_event, request) => {
    return bridgeIncidentController.diagnose(request);
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.dismissIncident, (_event, incidentId: string) => {
    return bridgeIncidentController.dismissIncident(incidentId);
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.runAction, (_event, request) => {
    return bridgeActionRunner.runAction(request);
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.start, async () => {
    await syncBridgeSettingsCache();
    bridgeManager.reloadAdapters();
    return bridgeManager.start();
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.stop, async () => {
    await bridgeManager.stop();
  });
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.startPlatform,
    async (_event, platform: string) => {
      await syncBridgeSettingsCache();
      bridgeManager.reloadAdapters();
      return bridgeManager.startPlatform(platform);
    },
  );
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.stopPlatform,
    async (_event, platform: string) => {
      await bridgeManager.stopPlatform(platform);
    },
  );
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.probe, async (_event, platform: string) => {
    return bridgeManager.probePlatform(platform);
  });
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.browseWorkingDirectory,
    async (_event, defaultPath?: string) => {
      const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: "Select Working Directory",
            defaultPath,
            properties: ["openDirectory", "createDirectory"],
          })
        : await dialog.showOpenDialog({
            title: "Select Working Directory",
            defaultPath,
            properties: ["openDirectory", "createDirectory"],
          });
      if (result.canceled || !result.filePaths[0]) {
        return null;
      }
      return result.filePaths[0];
    },
  );
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.verifyTelegram,
    async (_event, payload: { bot_token?: string; chat_id?: string }) => {
      const settings = bridgeConfigToSettingsMap(await readBridgeConfigFromConfigCenter());
      const explicitBotToken = payload.bot_token?.trim();
      const explicitChatId = payload.chat_id?.trim();
      const botToken = explicitBotToken || getSettingWithAliases(settings, "telegram_bot_token");
      const chatId = explicitChatId || getSettingWithAliases(settings, "telegram_chat_id");
      if (!botToken || botToken.startsWith("***")) {
        return { verified: false, error: "bot_token is required" };
      }
      const result = await verifyTelegramBot(botToken, chatId || undefined);
      if (result.verified) {
        await updateBridgeSettings((next) => {
          next.telegram_bot_token = explicitBotToken ?? botToken;
          next.bridge_telegram_bot_token = explicitBotToken ?? botToken;
          next.telegram_chat_id = explicitChatId ?? (chatId || "");
          next.bridge_telegram_chat_id = explicitChatId ?? (chatId || "");
        });
      }
      await updatePlatformVerificationState("telegram", result.verified);
      return result;
    },
  );
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.detectTelegramChatId,
    async (_event, payload: { bot_token?: string }) => {
      const settings = bridgeConfigToSettingsMap(await readBridgeConfigFromConfigCenter());
      const botToken = payload.bot_token?.trim() || getSettingWithAliases(settings, "telegram_bot_token");
      if (!botToken || botToken.startsWith("***")) {
        return { ok: false, error: "bot_token is required" };
      }
      return detectTelegramChatId(botToken);
    },
  );
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.verifyDiscord,
    async (_event, payload: { bot_token?: string }) => {
      const settings = bridgeConfigToSettingsMap(await readBridgeConfigFromConfigCenter());
      const explicitBotToken = payload.bot_token?.trim();
      const botToken = explicitBotToken || settings.bridge_discord_bot_token || "";
      if (!botToken || botToken.startsWith("***")) {
        return { verified: false, error: "Bot token is required" };
      }
      const result = await verifyDiscordBot(botToken);
      if (result.verified) {
        await updateBridgeSettings((next) => {
          next.bridge_discord_bot_token = explicitBotToken ?? botToken;
        });
      }
      await updatePlatformVerificationState("discord", result.verified);
      return result;
    },
  );
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.verifyFeishu,
    async (
      _event,
      payload: { app_id?: string; app_secret?: string; domain?: string },
    ) => {
      const settings = bridgeConfigToSettingsMap(await readBridgeConfigFromConfigCenter());
      const explicitAppId = payload.app_id?.trim();
      const explicitAppSecret = payload.app_secret?.trim();
      const explicitDomain = payload.domain?.trim();
      const appId = explicitAppId || settings.bridge_feishu_app_id || "";
      const appSecret = explicitAppSecret || settings.bridge_feishu_app_secret || "";
      const domain = explicitDomain || settings.bridge_feishu_domain || "feishu";
      if (!appId || !appSecret || appSecret.startsWith("***")) {
        return { verified: false, error: "App ID and App Secret are required" };
      }
      const result = await verifyFeishuApp(appId, appSecret, domain);
      if (result.verified) {
        await updateBridgeSettings((next) => {
          next.bridge_feishu_app_id = explicitAppId ?? appId;
          next.bridge_feishu_app_secret = explicitAppSecret ?? appSecret;
          next.bridge_feishu_domain = explicitDomain ?? domain;
        });
      }
      await updatePlatformVerificationState("feishu", result.verified);
      return result;
    },
  );
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.verifyQq,
    async (_event, payload: { app_id?: string; app_secret?: string }) => {
      const settings = bridgeConfigToSettingsMap(await readBridgeConfigFromConfigCenter());
      const explicitAppId = payload.app_id?.trim();
      const explicitAppSecret = payload.app_secret?.trim();
      const appId = explicitAppId || settings.bridge_qq_app_id || "";
      const appSecret = explicitAppSecret || settings.bridge_qq_app_secret || "";
      if (!appId || !appSecret || appSecret.startsWith("***")) {
        return { verified: false, error: "App ID and App Secret are required" };
      }
      const result = await verifyQqApp(appId, appSecret);
      if (result.verified) {
        await updateBridgeSettings((next) => {
          next.bridge_qq_app_id = explicitAppId ?? appId;
          next.bridge_qq_app_secret = explicitAppSecret ?? appSecret;
        });
      }
      await updatePlatformVerificationState("qq", result.verified);
      return result;
    },
  );
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.verifyWeixin, async () => {
    const result = verifyWeixinAccounts(weixinBridgeStore.listAccounts());
    await updatePlatformVerificationState("weixin", result.verified);
    return result;
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.listWeixinAccounts, () => {
    return weixinBridgeStore.listAccounts().map((account) => ({
      accountId: account.accountId,
      userId: account.userId,
      name: account.name,
      enabled: account.enabled,
      hasToken: Boolean(account.token),
      lastLoginAt: account.lastLoginAt,
      createdAt: account.createdAt,
    }));
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.startWeixinLogin, async () => {
    const session = await weixinAuthManager.startLogin();
    return {
      sessionId: session.sessionId,
      qrImage: session.qrImage,
      status: session.status,
      accountId: session.accountId,
      error: session.error,
    };
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.waitForWeixinLogin, async (_event, sessionId: string) => {
    const session = await weixinAuthManager.waitForLogin(sessionId);
    let bridgeRestartError: string | undefined;
    if (session.status === "confirmed") {
      await updatePlatformVerificationState("weixin", true);
      try {
        await restartBridgeIfRunning();
      } catch (error) {
        bridgeRestartError =
          error instanceof Error ? error.message : String(error);
      }
    }
    return {
      sessionId: session.sessionId,
      qrImage: session.qrImage,
      status: session.status,
      accountId: session.accountId,
      error: session.error,
      bridgeRestartError,
    };
  });
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.setWeixinAccountEnabled,
    async (_event, accountId: string, enabled: boolean) => {
      weixinBridgeStore.setAccountEnabled(accountId, enabled);
      await updatePlatformVerificationState(
        "weixin",
        verifyWeixinAccounts(weixinBridgeStore.listAccounts()).verified,
      );
      try {
        await restartBridgeIfRunning();
        return { ok: true, accountUpdated: true };
      } catch (error) {
        return {
          ok: false,
          accountUpdated: true,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.deleteWeixinAccount, async (_event, accountId: string) => {
    weixinBridgeStore.deleteAccount(accountId);
    await updatePlatformVerificationState(
      "weixin",
      verifyWeixinAccounts(weixinBridgeStore.listAccounts()).verified,
    );
    try {
      await restartBridgeIfRunning();
      return { ok: true, accountDeleted: true };
    } catch (error) {
      return {
        ok: false,
        accountDeleted: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  await restoreBridgeRuntimeIfNeeded();

  mainWindow.on("closed", () => {
    terminalManager.killAll();
    void clientSession?.dispose();
    clientSession = null;
    mainWindow = null;
    app.quit();
  });

  app.on("second-instance", () => {
    focusMainWindow(mainWindow);
  });
}

if (shouldAutoStartDesktopMain(__filename)) {
  void startDesktopMain().catch((error) => {
    console.error("Failed to start desktop main process", error);
    app.exit(1);
  });
}
