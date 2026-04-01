"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FieldRow } from "@/components/patterns/FieldRow";
import { SettingsCard } from "@/components/patterns/SettingsCard";
import { StatusBanner } from "@/components/patterns/StatusBanner";
import { Button } from "@/components/ui/button";
import { CheckCircle, SpinnerGap, Warning } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createBridgeClient } from "@/core/bridge/client";
import { useBridgeConfigEditor } from "@/core/bridge-config";

import {
  BridgePlatformRuntimeCard,
  useBridgeTranslation,
} from "./useBridgeTranslation";

export function QqBridgeSection() {
  const { t } = useBridgeTranslation();
  const { bridgeConfig, refetchConfig, saveBridgeConfig } = useBridgeConfigEditor();
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [allowedUsers, setAllowedUsers] = useState("");
  const [imageEnabled, setImageEnabled] = useState(true);
  const [maxImageSize, setMaxImageSize] = useState("20");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [bridgeEnabled, setBridgeEnabled] = useState(false);
  const [channelEnabled, setChannelEnabled] = useState(false);
  const [persistedVerified, setPersistedVerified] = useState(false);
  const savedCredentials = useRef({ appId: "", appSecret: "" });
  const credentialsDirty =
    appId !== savedCredentials.current.appId
    || appSecret !== savedCredentials.current.appSecret;
  const connectionVerified =
    persistedVerified && !credentialsDirty && Boolean(appId) && Boolean(appSecret);

  const fetchSettings = useCallback(async () => {
    const qq =
      bridgeConfig.qq;
    setBridgeEnabled(true);
    setChannelEnabled(qq.enabled);
    setPersistedVerified(qq.verified);
    setAppId(qq.app_id);
    setAppSecret(qq.app_secret);
    savedCredentials.current = {
      appId: qq.app_id,
      appSecret: qq.app_secret,
    };
    setAllowedUsers(qq.allowed_users);
    setImageEnabled(qq.image_enabled !== false);
    setMaxImageSize(qq.max_image_size || "20");
  }, [bridgeConfig]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSaveCredentials = () => {
    void (async () => {
      setSaving(true);
      try {
        await saveBridgeConfig((current) => ({
          ...current,
          qq: {
            ...current.qq,
            app_id: appId,
            app_secret: appSecret,
          },
        }));
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleSaveAllowedUsers = () => {
    void (async () => {
      setSaving(true);
      try {
        await saveBridgeConfig((current) => ({
          ...current,
          qq: {
            ...current.qq,
            allowed_users: allowedUsers,
          },
        }));
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleSaveImageSettings = () => {
    void (async () => {
      setSaving(true);
      try {
        await saveBridgeConfig((current) => ({
          ...current,
          qq: {
            ...current.qq,
            image_enabled: imageEnabled,
            max_image_size: maxImageSize,
          },
        }));
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleVerify = async () => {
    await ensureQqVerifiedBeforeEnable();
  };

  const ensureQqVerifiedBeforeEnable = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      if (!appId) {
        setVerifyResult({
          ok: false,
          message: t("qq.enterCredentialsFirst"),
        });
        return false;
      }

      const client = createBridgeClient();
      const result = await client.verifyQq({
        app_id: appId,
        app_secret: appSecret,
      });

      if (result.verified) {
        setVerifyResult({ ok: true, message: t("qq.verified") });
        setPersistedVerified(true);
        await refetchConfig();
        return true;
      }

      setVerifyResult({
        ok: false,
        message: result.error?.trim() ? result.error : t("qq.verifyFailed"),
      });
      await refetchConfig();
      return false;
    } catch {
      setVerifyResult({ ok: false, message: t("qq.verifyFailed") });
      await refetchConfig();
      return false;
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <BridgePlatformRuntimeCard
        platform="qq"
        bridgeEnabled={bridgeEnabled}
        channelEnabled={channelEnabled}
        connectionVerified={connectionVerified}
        onEnableBeforeStart={async () => {
          const verified = await ensureQqVerifiedBeforeEnable();
          if (!verified) {
            return false;
          }
          const saved = await saveBridgeConfig((current) => ({
            ...current,
            qq: {
              ...current.qq,
              enabled: true,
            },
          }));
          if (!saved) {
            return false;
          }
          return true;
        }}
      />

      <SettingsCard title={t("qq.credentials")} description={t("qq.credentialsDesc")}>
        <div className="space-y-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              {t("qq.appId")}
            </label>
            <Input
              value={appId}
              onChange={(event) => setAppId(event.target.value)}
              placeholder="xxxxxxxxxx"
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              {t("qq.appSecret")}
            </label>
            <Input
              type="password"
              value={appSecret}
              onChange={(event) => setAppSecret(event.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSaveCredentials} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleVerify()}
            disabled={verifying || !appId}
          >
            {verifying ? <SpinnerGap size={14} className="mr-1.5 animate-spin" /> : null}
            {t("qq.verify")}
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

      <SettingsCard title={t("qq.allowedUsers")} description={t("qq.allowedUsersDesc")}>
        <div>
          <Input
            value={allowedUsers}
            onChange={(event) => setAllowedUsers(event.target.value)}
            placeholder="user_openid_1, user_openid_2"
            className="font-mono text-sm"
          />
          <p className="text-muted-foreground mt-1 text-xs">{t("qq.allowedUsersHint")}</p>
        </div>

        <Button size="sm" onClick={handleSaveAllowedUsers} disabled={saving}>
          {saving ? t("common.loading") : t("common.save")}
        </Button>
      </SettingsCard>

      <SettingsCard title={t("qq.imageSettings")} description={t("qq.imageSettingsDesc")}>
        <div className="space-y-3">
          <FieldRow label={t("qq.imageEnabled")} description={t("qq.imageEnabledDesc")}>
            <Switch checked={imageEnabled} onCheckedChange={setImageEnabled} />
          </FieldRow>

          {imageEnabled ? (
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                {t("qq.maxImageSize")}
              </label>
              <Input
                type="number"
                value={maxImageSize}
                onChange={(event) => setMaxImageSize(event.target.value)}
                placeholder="20"
                className="w-32 text-sm"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {t("qq.maxImageSizeHint")}
              </p>
            </div>
          ) : null}
        </div>

        <Button size="sm" onClick={handleSaveImageSettings} disabled={saving}>
          {saving ? t("common.loading") : t("common.save")}
        </Button>
      </SettingsCard>

      <SettingsCard title={t("qq.setupGuide")}>
        <ol className="text-muted-foreground list-decimal space-y-1.5 pl-4 text-xs">
          <li>{t("qq.step1")}</li>
          <li>{t("qq.step2")}</li>
          <li>{t("qq.step3")}</li>
          <li>{t("qq.step4")}</li>
          <li>{t("qq.step5")}</li>
        </ol>
      </SettingsCard>
    </div>
  );
}
