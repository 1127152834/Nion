import { useMemo } from "react";

import { useConfigEditor } from "@/components/workspace/settings/use-config-editor";

export type BridgePlatformCommon = {
  enabled: boolean;
  verified: boolean;
  verified_at: string | null;
  verified_fingerprint: string;
};

export type BridgeTelegramConfig = BridgePlatformCommon & {
  bot_token: string;
  chat_id: string;
  allowed_users: string;
};

export type BridgeFeishuConfig = BridgePlatformCommon & {
  app_id: string;
  app_secret: string;
  domain: string;
  allow_from: string;
  dm_policy: string;
  thread_session: boolean;
  group_policy: string;
  group_allow_from: string;
  require_mention: boolean;
};

export type BridgeDiscordConfig = BridgePlatformCommon & {
  bot_token: string;
  allowed_users: string;
  allowed_channels: string;
  allowed_guilds: string;
  group_policy: string;
  require_mention: boolean;
  stream_enabled: boolean;
  max_attachment_size: string;
  image_enabled: boolean;
};

export type BridgeQqConfig = BridgePlatformCommon & {
  app_id: string;
  app_secret: string;
  allowed_users: string;
  image_enabled: boolean;
  max_image_size: string;
};

export type BridgeWeixinConfig = BridgePlatformCommon;

export type BridgeDraft = {
  auto_start: boolean;
  default_work_dir: string;
  default_model: string;
  default_provider_id: string;
  telegram: BridgeTelegramConfig;
  feishu: BridgeFeishuConfig;
  discord: BridgeDiscordConfig;
  qq: BridgeQqConfig;
  weixin: BridgeWeixinConfig;
};

const DEFAULT_BRIDGE_CONFIG: BridgeDraft = {
  auto_start: false,
  default_work_dir: "",
  default_model: "",
  default_provider_id: "",
  telegram: {
    enabled: false,
    verified: false,
    verified_at: null,
    verified_fingerprint: "",
    bot_token: "",
    chat_id: "",
    allowed_users: "",
  },
  feishu: {
    enabled: false,
    verified: false,
    verified_at: null,
    verified_fingerprint: "",
    app_id: "",
    app_secret: "",
    domain: "feishu",
    allow_from: "",
    dm_policy: "open",
    thread_session: false,
    group_policy: "open",
    group_allow_from: "",
    require_mention: false,
  },
  discord: {
    enabled: false,
    verified: false,
    verified_at: null,
    verified_fingerprint: "",
    bot_token: "",
    allowed_users: "",
    allowed_channels: "",
    allowed_guilds: "",
    group_policy: "open",
    require_mention: false,
    stream_enabled: true,
    max_attachment_size: "",
    image_enabled: true,
  },
  qq: {
    enabled: false,
    verified: false,
    verified_at: null,
    verified_fingerprint: "",
    app_id: "",
    app_secret: "",
    allowed_users: "",
    image_enabled: true,
    max_image_size: "20",
  },
  weixin: {
    enabled: false,
    verified: false,
    verified_at: null,
    verified_fingerprint: "",
  },
};

export function useBridgeConfigEditor() {
  const configEditor = useConfigEditor({
    prepareConfig: (config) => {
      const next = { ...config };
      next.bridge = {
        ...DEFAULT_BRIDGE_CONFIG,
        ...(typeof config.bridge === "object" && config.bridge ? config.bridge : {}),
      };
      return next;
    },
  });

  const bridgeConfig = useMemo<BridgeDraft>(() => {
    const bridge = configEditor.draftConfig.bridge;
    return typeof bridge === "object" && bridge
      ? ({ ...DEFAULT_BRIDGE_CONFIG, ...bridge } as BridgeDraft)
      : DEFAULT_BRIDGE_CONFIG;
  }, [configEditor.draftConfig.bridge]);

  const updateBridgeConfig = (updater: (current: BridgeDraft) => BridgeDraft) => {
    const nextBridge = updater(bridgeConfig);
    configEditor.onConfigChange({
      ...configEditor.draftConfig,
      bridge: nextBridge,
    });
  };

  return {
    ...configEditor,
    bridgeConfig,
    updateBridgeConfig,
  };
}
