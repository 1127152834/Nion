"use client";

import { useCallback, useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";
import {
  getBridgeClient,
  type BridgeStatus,
} from "@/core/bridge/client";
import { cn } from "@/lib/utils";

import {
  CheckCircle,
  ChatsCircle,
  ChatTeardrop,
  FieldRow,
  GameController,
  isBridgePlatformVerified,
  settingToBool,
  SettingsCard,
  StatusBanner,
  TelegramLogo,
  useBridgeTranslation,
  Warning,
} from "./bridge-shared";

type BridgeSettings = {
  remote_bridge_enabled: string;
  bridge_telegram_enabled: string;
  bridge_feishu_enabled: string;
  bridge_discord_enabled: string;
  bridge_qq_enabled: string;
  bridge_weixin_enabled: string;
  bridge_auto_start: string;
};

const DEFAULT_SETTINGS: BridgeSettings = {
  remote_bridge_enabled: "",
  bridge_telegram_enabled: "",
  bridge_feishu_enabled: "",
  bridge_discord_enabled: "",
  bridge_qq_enabled: "",
  bridge_weixin_enabled: "",
  bridge_auto_start: "",
};

export function BridgeSection() {
  const [settings, setSettings] = useState<BridgeSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<BridgeStatus>({
    running: false,
    startedAt: null,
    enabledPlatforms: [],
    adapters: [],
  });
  const { t } = useBridgeTranslation();
  const client = getBridgeClient();

  const fetchSettings = useCallback(async () => {
    if (!client) {
      return;
    }
    const data = await client.getSettings();
    const next = { ...DEFAULT_SETTINGS, ...data };
    setSettings(next);
  }, [client]);

  const refreshStatus = useCallback(async () => {
    if (!client) {
      return;
    }
    setStatus(await client.getStatus());
  }, [client]);

  useEffect(() => {
    void fetchSettings();
    void refreshStatus();
  }, [fetchSettings, refreshStatus]);

  if (!client) {
    return (
      <SettingsCard>
        <p className="text-sm text-muted-foreground">
          Bridge is only available in the desktop app.
        </p>
      </SettingsCard>
    );
  }

  const saveSettings = async (updates: Partial<BridgeSettings>) => {
    setSaving(true);
    try {
      await client.saveSettings(updates);
      setSettings((current) => ({ ...current, ...updates }));
      await refreshStatus();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = (checked: boolean) => {
    void saveSettings({ remote_bridge_enabled: checked ? "true" : "" });
  };

  const isEnabled = settingToBool(settings.remote_bridge_enabled);
  const isTelegramEnabled = settingToBool(settings.bridge_telegram_enabled);
  const isFeishuEnabled = settingToBool(settings.bridge_feishu_enabled);
  const isDiscordEnabled = settingToBool(settings.bridge_discord_enabled);
  const isQqEnabled = settingToBool(settings.bridge_qq_enabled);
  const isWeixinEnabled = settingToBool(settings.bridge_weixin_enabled);
  const isAutoStart = settingToBool(settings.bridge_auto_start);
  const isRunning = status.running;
  const adapterCount = status.adapters.length;

  const verifiedPlatforms = {
    telegram: isBridgePlatformVerified(settings, "telegram"),
    feishu: isBridgePlatformVerified(settings, "feishu"),
    discord: isBridgePlatformVerified(settings, "discord"),
    qq: isBridgePlatformVerified(settings, "qq"),
    weixin: isBridgePlatformVerified(settings, "weixin"),
  };

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsCard className={isEnabled ? "border-primary/50 bg-primary/5" : undefined}>
        <FieldRow
          label={t("bridge.title")}
          description={t("bridge.description")}
        >
          <button
            type="button"
            onClick={() => handleToggleEnabled(!isEnabled)}
            disabled={saving}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          >
            {isEnabled ? t("bridge.stop") : t("bridge.start")}
          </button>
        </FieldRow>
        {isEnabled ? (
          <StatusBanner variant="info" className="bg-primary/10 text-primary">
            <span className="mr-1 inline-block h-2 w-2 shrink-0 rounded-full bg-primary" />
            {t("bridge.activeHint")}
          </StatusBanner>
        ) : null}
      </SettingsCard>

      {isEnabled ? (
        <SettingsCard>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium">{t("bridge.status")}</h2>
              <p className="text-xs text-muted-foreground">
                {status.running
                  ? t("bridge.activeBindings", { count: String(adapterCount) })
                  : t("bridge.noBindings")}
              </p>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs",
                status.running
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {status.running ? (
                <CheckCircle className="size-3.5 shrink-0" />
              ) : (
                <Warning className="size-3.5 shrink-0" />
              )}
              {status.running
                ? t("bridge.statusConnected")
                : t("bridge.statusDisconnected")}
            </div>
          </div>
        </SettingsCard>
      ) : null}

      {isEnabled ? (
        <SettingsCard
          title={t("bridge.channels")}
          description={t("bridge.channelsDesc")}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TelegramLogo className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{t("bridge.telegramChannel")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("bridge.telegramChannelDesc")}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {isTelegramEnabled
                  ? t("bridge.statusConnected")
                  : verifiedPlatforms.telegram
                    ? t("bridge.statusDisconnected")
                    : t("bridge.errorChannelNotVerified")}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/30 pt-3">
              <div className="flex items-center gap-3">
                <ChatTeardrop className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{t("bridge.feishuChannel")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("bridge.feishuChannelDesc")}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {isFeishuEnabled
                  ? t("bridge.statusConnected")
                  : verifiedPlatforms.feishu
                    ? t("bridge.statusDisconnected")
                    : t("bridge.errorChannelNotVerified")}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/30 pt-3">
              <div className="flex items-center gap-3">
                <GameController className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{t("bridge.discordChannel")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("bridge.discordChannelDesc")}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {isDiscordEnabled
                  ? t("bridge.statusConnected")
                  : verifiedPlatforms.discord
                    ? t("bridge.statusDisconnected")
                    : t("bridge.errorChannelNotVerified")}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/30 pt-3">
              <div className="flex items-center gap-3">
                <ChatsCircle className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{t("bridge.qqChannel")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("bridge.qqChannelDesc")}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {isQqEnabled
                  ? t("bridge.statusConnected")
                  : verifiedPlatforms.qq
                    ? t("bridge.statusDisconnected")
                    : t("bridge.errorChannelNotVerified")}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/30 pt-3">
              <div className="flex items-center gap-3">
                <ChatTeardrop className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm">{t("bridge.weixinChannel")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("bridge.weixinChannelDesc")}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {isWeixinEnabled
                  ? t("bridge.statusConnected")
                  : verifiedPlatforms.weixin
                    ? t("bridge.statusDisconnected")
                    : t("bridge.errorChannelNotVerified")}
              </div>
            </div>

            <FieldRow
              label={t("bridge.autoStart")}
              description={t("bridge.autoStartDesc")}
              separator
            >
              <Switch
                checked={isAutoStart}
                onCheckedChange={(checked) =>
                  void saveSettings({
                    bridge_auto_start: checked ? "true" : "",
                  })
                }
                disabled={saving}
              />
            </FieldRow>
          </div>
        </SettingsCard>
      ) : null}

      {isEnabled && isRunning && adapterCount > 0 ? (
        <SettingsCard
          title={t("bridge.adapters")}
          description={t("bridge.adaptersDesc")}
        >
          <div className="space-y-2">
            {status.adapters.map((adapter) => (
              <div
                key={`${adapter.channelType}:${adapter.platform}`}
                className="space-y-1 rounded-md border border-border/30 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium capitalize">
                    {adapter.channelType || adapter.platform}
                  </span>
                  <div
                    className={cn(
                      "rounded px-2 py-0.5 text-xs",
                      adapter.running
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {adapter.running
                      ? t("bridge.adapterRunning")
                      : t("bridge.adapterStopped")}
                  </div>
                </div>
                {adapter.lastMessageAt ? (
                  <p className="text-xs text-muted-foreground">
                    {t("bridge.adapterLastMessage")}:{" "}
                    {new Date(adapter.lastMessageAt).toLocaleString()}
                  </p>
                ) : null}
                {adapter.error ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {t("bridge.adapterLastError")}: {adapter.error}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </SettingsCard>
      ) : null}
    </div>
  );
}
