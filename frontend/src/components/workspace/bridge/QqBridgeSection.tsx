"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, SpinnerGap, Warning } from "@/components/ui/icon";
import { FieldRow } from "@/components/patterns/FieldRow";
import { SettingsCard } from "@/components/patterns/SettingsCard";
import { StatusBanner } from "@/components/patterns/StatusBanner";
import { createBridgeClient } from "@/core/bridge/client";

import { useBridgeTranslation } from "./useBridgeTranslation";

type QqBridgeSettings = {
  bridge_qq_app_id: string;
  bridge_qq_app_secret: string;
  bridge_qq_allowed_users: string;
  bridge_qq_image_enabled: string;
  bridge_qq_max_image_size: string;
};

const DEFAULT_SETTINGS: QqBridgeSettings = {
  bridge_qq_app_id: "",
  bridge_qq_app_secret: "",
  bridge_qq_allowed_users: "",
  bridge_qq_image_enabled: "true",
  bridge_qq_max_image_size: "20",
};

export function QqBridgeSection() {
  const { t } = useBridgeTranslation();
  const [, setSettings] = useState<QqBridgeSettings>(DEFAULT_SETTINGS);
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

  const fetchSettings = useCallback(async () => {
    const client = createBridgeClient();
    const data = await client.getSettings();
    const next = { ...DEFAULT_SETTINGS, ...data };
    setSettings(next);
    setAppId(next.bridge_qq_app_id);
    setAppSecret(next.bridge_qq_app_secret);
    setAllowedUsers(next.bridge_qq_allowed_users);
    setImageEnabled(next.bridge_qq_image_enabled !== "false");
    setMaxImageSize(next.bridge_qq_max_image_size || "20");
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (updates: Partial<QqBridgeSettings>) => {
    setSaving(true);
    try {
      const client = createBridgeClient();
      await client.saveSettings(updates);
      setSettings((current) => ({ ...current, ...updates }));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCredentials = () => {
    const updates: Partial<QqBridgeSettings> = {
      bridge_qq_app_id: appId,
    };
    if (appSecret && !appSecret.startsWith("***")) {
      updates.bridge_qq_app_secret = appSecret;
    }
    void saveSettings(updates);
  };

  const handleSaveAllowedUsers = () => {
    void saveSettings({
      bridge_qq_allowed_users: allowedUsers,
    });
  };

  const handleSaveImageSettings = () => {
    void saveSettings({
      bridge_qq_image_enabled: imageEnabled ? "true" : "false",
      bridge_qq_max_image_size: maxImageSize,
    });
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      if (!appId) {
        setVerifyResult({
          ok: false,
          message: t("qq.enterCredentialsFirst"),
        });
        return;
      }

      const client = createBridgeClient();
      const result = await client.verifyQq({
        app_id: appId,
        app_secret: appSecret,
      });

      if (result.verified) {
        setVerifyResult({ ok: true, message: t("qq.verified") });
        return;
      }

      setVerifyResult({
        ok: false,
        message: result.error || t("qq.verifyFailed"),
      });
    } catch {
      setVerifyResult({ ok: false, message: t("qq.verifyFailed") });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
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
