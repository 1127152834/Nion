"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createBridgeClient } from "@/core/bridge/client";

import {
  BridgePlatformEnableCard,
  BridgePlatformRuntimeCard,
  CheckCircle,
  FieldRow,
  SettingsCard,
  SpinnerGap,
  StatusBanner,
  useBridgeTranslation,
  Warning,
} from "./bridge-shared";

type DiscordBridgeSettings = {
  remote_bridge_enabled: string;
  bridge_discord_enabled: string;
  bridge_discord_bot_token: string;
  bridge_discord_allowed_users: string;
  bridge_discord_allowed_channels: string;
  bridge_discord_allowed_guilds: string;
  bridge_discord_group_policy: string;
  bridge_discord_require_mention: string;
  bridge_discord_stream_enabled: string;
  bridge_discord_max_attachment_size: string;
  bridge_discord_image_enabled: string;
};

const DEFAULT_SETTINGS: DiscordBridgeSettings = {
  remote_bridge_enabled: "",
  bridge_discord_enabled: "",
  bridge_discord_bot_token: "",
  bridge_discord_allowed_users: "",
  bridge_discord_allowed_channels: "",
  bridge_discord_allowed_guilds: "",
  bridge_discord_group_policy: "open",
  bridge_discord_require_mention: "false",
  bridge_discord_stream_enabled: "true",
  bridge_discord_max_attachment_size: "",
  bridge_discord_image_enabled: "true",
};

export function DiscordBridgeSection() {
  const { t } = useBridgeTranslation();
  const [, setSettings] = useState<DiscordBridgeSettings>(DEFAULT_SETTINGS);
  const [botToken, setBotToken] = useState("");
  const [allowedUsers, setAllowedUsers] = useState("");
  const [allowedChannels, setAllowedChannels] = useState("");
  const [allowedGuilds, setAllowedGuilds] = useState("");
  const [groupPolicy, setGroupPolicy] = useState("open");
  const [requireMention, setRequireMention] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [maxAttachmentSize, setMaxAttachmentSize] = useState("");
  const [imageEnabled, setImageEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [bridgeEnabled, setBridgeEnabled] = useState(false);
  const [channelEnabled, setChannelEnabled] = useState(false);

  const fetchSettings = useCallback(async () => {
    const client = createBridgeClient();
    const data = await client.getSettings();
    const next = { ...DEFAULT_SETTINGS, ...data };
    setSettings(next);
    setBridgeEnabled(next.remote_bridge_enabled === "true");
    setChannelEnabled(next.bridge_discord_enabled === "true");
    setBotToken(next.bridge_discord_bot_token);
    setAllowedUsers(next.bridge_discord_allowed_users);
    setAllowedChannels(next.bridge_discord_allowed_channels);
    setAllowedGuilds(next.bridge_discord_allowed_guilds);
    setGroupPolicy(next.bridge_discord_group_policy || "open");
    setRequireMention(next.bridge_discord_require_mention === "true");
    setStreamEnabled(next.bridge_discord_stream_enabled !== "false");
    setMaxAttachmentSize(next.bridge_discord_max_attachment_size || "");
    setImageEnabled(next.bridge_discord_image_enabled !== "false");
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (updates: Partial<DiscordBridgeSettings>) => {
    setSaving(true);
    try {
      const client = createBridgeClient();
      await client.saveSettings(updates as Record<string, string>);
      setSettings((current) => ({ ...current, ...updates }));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCredentials = async () => {
    const updates: Partial<DiscordBridgeSettings> = {};
    if (botToken && !botToken.startsWith("***")) {
      updates.bridge_discord_bot_token = botToken;
    }
    await saveSettings(updates);
  };

  const handleSaveGroupSettings = async () => {
    await saveSettings({
      bridge_discord_allowed_users: allowedUsers,
      bridge_discord_allowed_channels: allowedChannels,
      bridge_discord_allowed_guilds: allowedGuilds,
      bridge_discord_group_policy: groupPolicy,
      bridge_discord_require_mention: requireMention ? "true" : "false",
      bridge_discord_stream_enabled: streamEnabled ? "true" : "false",
      bridge_discord_max_attachment_size: maxAttachmentSize,
      bridge_discord_image_enabled: imageEnabled ? "true" : "false",
    });
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      if (!botToken) {
        setVerifyResult({
          ok: false,
          message: t("discord.enterTokenFirst"),
        });
        return;
      }

      const result = await createBridgeClient().verifyDiscord({
        bot_token: botToken,
      });

      if (result.verified) {
        setVerifyResult({
          ok: true,
          message: result.botName
            ? t("discord.verifiedAs", { name: result.botName })
            : t("discord.verified"),
        });
        return;
      }

      setVerifyResult({
        ok: false,
        message: result.error || t("discord.verifyFailed"),
      });
    } catch {
      setVerifyResult({ ok: false, message: t("discord.verifyFailed") });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <BridgePlatformEnableCard
        title={t("bridge.discordChannel")}
        description={t("bridge.discordChannelDesc")}
        enabled={channelEnabled}
        saving={saving}
        onToggle={(checked) =>
          void saveSettings({
            bridge_discord_enabled: checked ? "true" : "",
            ...(checked ? { remote_bridge_enabled: "true" } : {}),
          })
        }
      />

      <BridgePlatformRuntimeCard
        platform="discord"
        bridgeEnabled={bridgeEnabled}
        channelEnabled={channelEnabled}
      />

      <SettingsCard
        title={t("discord.credentials")}
        description={t("discord.credentialsDesc")}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("discord.botToken")}
            </label>
            <Input
              type="password"
              value={botToken}
              onChange={(event) => setBotToken(event.target.value)}
              placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.XXXXXX.XXXXXXXXXX"
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => void handleSaveCredentials()} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleVerify()}
            disabled={verifying || !botToken}
          >
            {verifying ? (
              <SpinnerGap size={14} className="mr-1.5 animate-spin" />
            ) : null}
            {t("discord.verify")}
          </Button>
        </div>

        {verifyResult ? (
          <StatusBanner
            variant={verifyResult.ok ? "success" : "error"}
            icon={
              verifyResult.ok ? (
                <CheckCircle size={16} className="shrink-0" />
              ) : (
                <Warning size={16} className="shrink-0" />
              )
            }
          >
            {verifyResult.message}
          </StatusBanner>
        ) : null}
      </SettingsCard>

      <SettingsCard
        title={t("discord.allowedUsers")}
        description={t("discord.allowedUsersDesc")}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("discord.allowedUserIds")}
            </label>
            <Input
              value={allowedUsers}
              onChange={(event) => setAllowedUsers(event.target.value)}
              placeholder="123456789012345678"
              className="font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("discord.allowedUsersHint")}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("discord.allowedChannelIds")}
            </label>
            <Input
              value={allowedChannels}
              onChange={(event) => setAllowedChannels(event.target.value)}
              placeholder="123456789012345678"
              className="font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("discord.allowedChannelsHint")}
            </p>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("discord.guildSettings")}
        description={t("discord.guildSettingsDesc")}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("discord.allowedGuilds")}
            </label>
            <Input
              value={allowedGuilds}
              onChange={(event) => setAllowedGuilds(event.target.value)}
              placeholder="123456789012345678"
              className="font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("discord.allowedGuildsHint")}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("discord.groupPolicy")}
            </label>
            <Select value={groupPolicy} onValueChange={setGroupPolicy}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">{t("discord.groupPolicyOpen")}</SelectItem>
                <SelectItem value="disabled">
                  {t("discord.groupPolicyDisabled")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <FieldRow
            label={t("discord.requireMention")}
            description={t("discord.requireMentionDesc")}
          >
            <Switch checked={requireMention} onCheckedChange={setRequireMention} />
          </FieldRow>

          <FieldRow
            label={t("discord.streamPreview")}
            description={t("discord.streamPreviewDesc")}
            separator
          >
            <Switch checked={streamEnabled} onCheckedChange={setStreamEnabled} />
          </FieldRow>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("discord.imageSettings")}
        description={t("discord.imageSettingsDesc")}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("discord.maxAttachmentSize")}
            </label>
            <Input
              type="number"
              value={maxAttachmentSize}
              onChange={(event) => setMaxAttachmentSize(event.target.value)}
              placeholder="20"
              className="w-32 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("discord.maxAttachmentSizeHint")}
            </p>
          </div>

          <FieldRow
            label={t("discord.imageEnabled")}
            description={t("discord.imageEnabledDesc")}
            separator
          >
            <Switch checked={imageEnabled} onCheckedChange={setImageEnabled} />
          </FieldRow>
        </div>

        <Button size="sm" onClick={() => void handleSaveGroupSettings()} disabled={saving}>
          {saving ? t("common.loading") : t("common.save")}
        </Button>
      </SettingsCard>

      <SettingsCard title={t("discord.setupGuide")}>
        <div>
          <h3 className="mb-1.5 text-xs font-medium">{t("discord.setupBotTitle")}</h3>
          <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
            <li>{t("discord.step1")}</li>
            <li>{t("discord.step2")}</li>
            <li>{t("discord.step3")}</li>
            <li>{t("discord.step4")}</li>
            <li>{t("discord.step5")}</li>
            <li>{t("discord.step6")}</li>
            <li>{t("discord.step7")}</li>
          </ol>
        </div>

        <div className="border-t border-border/30 pt-3">
          <h3 className="mb-1.5 text-xs font-medium">{t("discord.setupIdTitle")}</h3>
          <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
            <li>{t("discord.stepDevMode")}</li>
            <li>{t("discord.stepUserId")}</li>
            <li>{t("discord.stepChannelId")}</li>
            <li>{t("discord.stepGuildId")}</li>
          </ol>
        </div>
      </SettingsCard>
    </div>
  );
}
