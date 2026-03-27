"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { getBridgeClient } from "@/core/bridge/client";

import {
  CheckCircle,
  SettingsCard,
  SpinnerGap,
  StatusBanner,
  useBridgeTranslation,
  Warning,
} from "./bridge-shared";

type TelegramBridgeSettings = {
  telegram_bot_token: string;
  telegram_chat_id: string;
  telegram_bridge_allowed_users: string;
};

const DEFAULT_SETTINGS: TelegramBridgeSettings = {
  telegram_bot_token: "",
  telegram_chat_id: "",
  telegram_bridge_allowed_users: "",
};

export function TelegramBridgeSection() {
  const client = getBridgeClient();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [allowedUsers, setAllowedUsers] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const { t } = useBridgeTranslation();

  const fetchSettings = useCallback(async () => {
    if (!client) {
      return;
    }
    const data = await client.getSettings();
    const settings = {
      ...DEFAULT_SETTINGS,
      telegram_bot_token:
        data.telegram_bot_token || data.bridge_telegram_bot_token || "",
      telegram_chat_id:
        data.telegram_chat_id || data.bridge_telegram_chat_id || "",
      telegram_bridge_allowed_users: data.telegram_bridge_allowed_users || "",
    };
    setBotToken(settings.telegram_bot_token);
    setChatId(settings.telegram_chat_id);
    setAllowedUsers(settings.telegram_bridge_allowed_users);
  }, [client]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  if (!client) {
    return null;
  }

  const handleSaveCredentials = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string> = {
        telegram_chat_id: chatId,
        bridge_telegram_chat_id: chatId,
        telegram_bridge_allowed_users: allowedUsers,
      };
      if (botToken && !botToken.startsWith("***")) {
        updates.telegram_bot_token = botToken;
        updates.bridge_telegram_bot_token = botToken;
      }
      await client.saveSettings(updates);
      await fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  const handleDetectChatId = async () => {
    if (!botToken) {
      setVerifyResult({
        ok: false,
        message: t("telegram.enterTokenFirst"),
      });
      return;
    }

    setDetecting(true);
    setVerifyResult(null);
    try {
      const result = await client.detectTelegramChatId({
        bot_token: botToken,
      });
      if (result.ok && result.chatId) {
        setChatId(result.chatId);
        setVerifyResult({
          ok: true,
          message: t("telegram.chatIdDetected", {
            id: result.chatId,
            name: result.chatTitle || result.chatId,
          }),
        });
      } else {
        setVerifyResult({
          ok: false,
          message: result.error || t("telegram.chatIdDetectFailed"),
        });
      }
    } finally {
      setDetecting(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      if (!botToken) {
        setVerifyResult({
          ok: false,
          message: t("telegram.enterTokenFirst"),
        });
        return;
      }

      const result = await client.verifyTelegram({
        bot_token: botToken,
        chat_id: chatId || undefined,
      });

      if (result.verified) {
        setVerifyResult({
          ok: true,
          message: result.botName
            ? t("telegram.verifiedAs", { name: result.botName })
            : t("telegram.verified"),
        });
      } else {
        setVerifyResult({
          ok: false,
          message: result.error || t("telegram.verifyFailed"),
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsCard
        title={t("telegram.credentials")}
        description={t("telegram.credentialsDesc")}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("telegram.botToken")}
            </label>
            <Input
              type="password"
              value={botToken}
              onChange={(event) => setBotToken(event.target.value)}
              placeholder="123456:ABC-DEF..."
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("telegram.chatId")}
            </label>
            <div className="flex gap-2">
              <Input
                value={chatId}
                onChange={(event) => setChatId(event.target.value)}
                placeholder="-1001234567890"
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleDetectChatId()}
                disabled={detecting || !botToken}
                className="shrink-0"
              >
                {detecting ? (
                  <SpinnerGap className="mr-1.5 size-3.5 animate-spin" />
                ) : null}
                {t("telegram.detectChatId")}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("telegram.chatIdHint")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => void handleSaveCredentials()}
            disabled={saving}
          >
            {saving ? t("common.loading") : t("common.save")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleVerify()}
            disabled={verifying || !botToken}
          >
            {verifying ? (
              <SpinnerGap className="mr-1.5 size-3.5 animate-spin" />
            ) : null}
            {t("telegram.verify")}
          </Button>
        </div>

        {verifyResult ? (
          <StatusBanner
            variant={verifyResult.ok ? "success" : "error"}
            icon={
              verifyResult.ok ? (
                <CheckCircle className="size-4 shrink-0" />
              ) : (
                <Warning className="size-4 shrink-0" />
              )
            }
          >
            {verifyResult.message}
          </StatusBanner>
        ) : null}
      </SettingsCard>

      <SettingsCard
        title={t("bridge.allowedUsers")}
        description={t("bridge.allowedUsersDesc")}
      >
        <div>
          <Input
            value={allowedUsers}
            onChange={(event) => setAllowedUsers(event.target.value)}
            placeholder="123456789, 987654321"
            className="font-mono text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t("bridge.allowedUsersHint")}
          </p>
        </div>
      </SettingsCard>

      <SettingsCard title={t("telegram.setupGuide")}>
        <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
          <li>{t("telegram.step1")}</li>
          <li>{t("telegram.step2")}</li>
          <li>{t("telegram.step3")}</li>
          <li>{t("telegram.step4")}</li>
          <li>{t("telegram.step5")}</li>
          <li>{t("telegram.step6")}</li>
        </ol>
      </SettingsCard>
    </div>
  );
}
