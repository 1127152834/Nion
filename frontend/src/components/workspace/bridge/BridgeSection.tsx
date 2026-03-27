"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProviderInstances } from "@/core/model-admin/hooks";
import {
  createBridgeClient,
  getBridgeClient,
  type BridgeStatus,
} from "@/core/bridge/client";
import { cn } from "@/lib/utils";

import {
  CheckCircle,
  ChatsCircle,
  ChatTeardrop,
  FieldRow,
  Folder,
  GameController,
  settingToBool,
  SettingsCard,
  SpinnerGap,
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
  bridge_default_work_dir: string;
  bridge_default_model: string;
  bridge_default_provider_id: string;
};

const DEFAULT_SETTINGS: BridgeSettings = {
  remote_bridge_enabled: "",
  bridge_telegram_enabled: "",
  bridge_feishu_enabled: "",
  bridge_discord_enabled: "",
  bridge_qq_enabled: "",
  bridge_weixin_enabled: "",
  bridge_auto_start: "",
  bridge_default_work_dir: "",
  bridge_default_model: "",
  bridge_default_provider_id: "",
};

export function BridgeSection() {
  const [settings, setSettings] = useState<BridgeSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [workDir, setWorkDir] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState<BridgeStatus>({
    running: false,
    startedAt: null,
    enabledPlatforms: [],
    adapters: [],
  });
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const { data: providers = [] } = useProviderInstances();
  const { t } = useBridgeTranslation();
  const client = getBridgeClient();

  const providerGroups = useMemo(
    () =>
      providers
        .map((provider) => ({
          providerId: provider.id,
          providerName: provider.display_name,
          models: provider.models
            .filter((item) => item.is_enabled)
            .map((item) => ({
              value: item.model_id,
              label: item.display_name || item.model_id,
            })),
        }))
        .filter((group) => group.models.length > 0),
    [providers],
  );

  const fetchSettings = useCallback(async () => {
    if (!client) {
      return;
    }
    const data = await client.getSettings();
    const next = { ...DEFAULT_SETTINGS, ...data };
    setSettings(next);
    setWorkDir(next.bridge_default_work_dir);
    if (next.bridge_default_provider_id && next.bridge_default_model) {
      setModel(`${next.bridge_default_provider_id}::${next.bridge_default_model}`);
    } else {
      setModel(next.bridge_default_model);
    }
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

  const handleSaveDefaults = () => {
    const parts = model.split("::");
    const providerId = parts.length === 2 ? parts[0] : "";
    const modelValue = parts.length === 2 ? parts[1] : model;
    void saveSettings({
      bridge_default_work_dir: workDir,
      bridge_default_model: modelValue,
      bridge_default_provider_id: providerId,
    });
  };

  const handleBrowseFolder = async () => {
    const nextPath = await client.browseWorkingDirectory(workDir || undefined);
    if (nextPath) {
      setWorkDir(nextPath);
    }
  };

  const handleStartBridge = async () => {
    setStarting(true);
    try {
      const reason = await createBridgeClient().start();
      if (reason) {
        const reasonMessages: Record<string, string> = {
          bridge_not_enabled: t("bridge.errorNotEnabled"),
          no_channels_enabled: t("bridge.errorNoChannels"),
          no_adapters_started: t("bridge.errorNoAdapters"),
          network_error: t("bridge.errorNetwork"),
        };
        const message = reason.startsWith("adapter_config_invalid:")
          ? t("bridge.errorAdapterConfig")
          : reasonMessages[reason] ?? reason;
        toast.error(message);
      }
      await refreshStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("bridge.errorNetwork"));
    } finally {
      setStarting(false);
    }
  };

  const handleStopBridge = async () => {
    setStopping(true);
    try {
      await createBridgeClient().stop();
      await refreshStatus();
    } finally {
      setStopping(false);
    }
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

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsCard className={isEnabled ? "border-primary/50 bg-primary/5" : undefined}>
        <FieldRow
          label={t("bridge.title")}
          description={t("bridge.description")}
        >
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleEnabled}
            disabled={saving}
          />
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
                {isRunning
                  ? t("bridge.activeBindings", { count: String(adapterCount) })
                  : t("bridge.noBindings")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs",
                  isRunning
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {isRunning ? (
                  <CheckCircle className="size-3.5 shrink-0" />
                ) : (
                  <Warning className="size-3.5 shrink-0" />
                )}
                {isRunning
                  ? t("bridge.statusConnected")
                  : t("bridge.statusDisconnected")}
              </div>
              {isRunning ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleStopBridge()}
                  disabled={stopping}
                >
                  {stopping ? (
                    <SpinnerGap className="mr-1.5 size-3.5 animate-spin" />
                  ) : null}
                  {stopping ? t("bridge.stopping") : t("bridge.stop")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => void handleStartBridge()}
                  disabled={starting}
                >
                  {starting ? (
                    <SpinnerGap className="mr-1.5 size-3.5 animate-spin" />
                  ) : null}
                  {starting ? t("bridge.starting") : t("bridge.start")}
                </Button>
              )}
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
              <Switch
                checked={isTelegramEnabled}
                onCheckedChange={(checked) =>
                  void saveSettings({
                    bridge_telegram_enabled: checked ? "true" : "",
                  })
                }
                disabled={saving}
              />
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
              <Switch
                checked={isFeishuEnabled}
                onCheckedChange={(checked) =>
                  void saveSettings({
                    bridge_feishu_enabled: checked ? "true" : "",
                  })
                }
                disabled={saving}
              />
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
              <Switch
                checked={isDiscordEnabled}
                onCheckedChange={(checked) =>
                  void saveSettings({
                    bridge_discord_enabled: checked ? "true" : "",
                  })
                }
                disabled={saving}
              />
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
              <Switch
                checked={isQqEnabled}
                onCheckedChange={(checked) =>
                  void saveSettings({
                    bridge_qq_enabled: checked ? "true" : "",
                  })
                }
                disabled={saving}
              />
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
              <Switch
                checked={isWeixinEnabled}
                onCheckedChange={(checked) =>
                  void saveSettings({
                    bridge_weixin_enabled: checked ? "true" : "",
                  })
                }
                disabled={saving}
              />
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

      {isEnabled ? (
        <SettingsCard
          title={t("bridge.defaults")}
          description={t("bridge.defaultsDesc")}
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("bridge.defaultWorkDir")}
              </label>
              <div className="flex gap-2">
                <Input
                  value={workDir}
                  onChange={(event) => setWorkDir(event.target.value)}
                  placeholder="/path/to/project"
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleBrowseFolder()}
                  className="shrink-0"
                >
                  <Folder className="mr-1.5 size-3.5" />
                  {t("bridge.browse")}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("bridge.defaultWorkDirHint")}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("bridge.defaultModel")}
              </label>
              {providerGroups.length > 0 ? (
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-full font-mono text-sm">
                    <SelectValue placeholder={t("bridge.defaultModelHint")} />
                  </SelectTrigger>
                  <SelectContent>
                    {providerGroups.map((group) => (
                      <SelectGroup key={group.providerId}>
                        <SelectLabel>{group.providerName}</SelectLabel>
                        {group.models.map((item) => (
                          <SelectItem
                            key={`${group.providerId}::${item.value}`}
                            value={`${group.providerId}::${item.value}`}
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder="sonnet"
                  className="font-mono text-sm"
                />
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {t("bridge.defaultModelHint")}
              </p>
            </div>
          </div>

          <Button size="sm" onClick={handleSaveDefaults} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </SettingsCard>
      ) : null}
    </div>
  );
}
