"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useI18n } from "@/core/i18n/hooks";
import { getBridgeClient } from "@/core/bridge/client";

type TelegramBridgeSettings = {
  bridge_telegram_enabled: string;
  telegram_bridge_allowed_users: string;
  bridge_telegram_bot_token: string;
  bridge_telegram_chat_id: string;
};

const DEFAULT_SETTINGS: TelegramBridgeSettings = {
  bridge_telegram_enabled: "",
  telegram_bridge_allowed_users: "",
  bridge_telegram_bot_token: "",
  bridge_telegram_chat_id: "",
};

export function TelegramBridgeSection() {
  const client = getBridgeClient();
  const { t } = useI18n();
  const [settings, setSettings] = useState<TelegramBridgeSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [probeResult, setProbeResult] = useState("");

  useEffect(() => {
    if (!client) {
      return;
    }
    void client.getSettings().then((next) => {
      setSettings((current) => ({ ...current, ...next }));
    });
  }, [client]);

  const saveSettings = async () => {
    if (!client) {
      return;
    }
    setSaving(true);
    await client.saveSettings(settings);
    setSaving(false);
  };

  const probeConnection = async () => {
    if (!client) {
      return;
    }
    const result = await client.probe("telegram");
    setProbeResult(result.message);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-lg border p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t.bridge.telegram.title}</h2>
          <p className="text-muted-foreground text-sm">
            {t.bridge.telegram.description}
          </p>
        </div>
        <div className="mt-4 grid gap-3">
          <Input
            value={settings.bridge_telegram_bot_token}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                bridge_telegram_bot_token: event.target.value,
              }))
            }
            placeholder={t.bridge.telegram.botTokenPlaceholder}
            type="password"
          />
          <Input
            value={settings.bridge_telegram_chat_id}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                bridge_telegram_chat_id: event.target.value,
              }))
            }
            placeholder={t.bridge.telegram.chatIdPlaceholder}
          />
          <Input
            value={settings.telegram_bridge_allowed_users}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                telegram_bridge_allowed_users: event.target.value,
              }))
            }
            placeholder={t.bridge.telegram.allowedUsersPlaceholder}
          />
          <Button type="button" size="sm" onClick={() => void saveSettings()} disabled={saving}>
            {t.bridge.telegram.saveAction}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void probeConnection()}>
            {t.bridge.telegram.testAction}
          </Button>
          {probeResult ? (
            <div className="text-muted-foreground text-sm">{probeResult}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
