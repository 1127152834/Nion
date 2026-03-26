"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";

import { getBridgeClient } from "@/core/bridge/client";

type QqBridgeSettings = {
  bridge_qq_app_id: string;
  bridge_qq_app_secret: string;
  bridge_qq_allowed_users: string;
};

const DEFAULT_SETTINGS: QqBridgeSettings = {
  bridge_qq_app_id: "",
  bridge_qq_app_secret: "",
  bridge_qq_allowed_users: "",
};

export function QqBridgeSection() {
  const client = getBridgeClient();
  const { t } = useI18n();
  const [settings, setSettings] = useState<QqBridgeSettings>(DEFAULT_SETTINGS);
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
    const result = await client.probe("qq");
    setProbeResult(result.message);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-lg border p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t.bridge.qq.title}</h2>
          <p className="text-muted-foreground text-sm">
            {t.bridge.qq.description}
          </p>
        </div>
        <div className="mt-4 grid gap-3">
          <Input
            value={settings.bridge_qq_app_id}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                bridge_qq_app_id: event.target.value,
              }))
            }
            placeholder={t.bridge.qq.appIdPlaceholder}
          />
          <Input
            value={settings.bridge_qq_app_secret}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                bridge_qq_app_secret: event.target.value,
              }))
            }
            placeholder={t.bridge.qq.appSecretPlaceholder}
            type="password"
          />
          <Input
            value={settings.bridge_qq_allowed_users}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                bridge_qq_allowed_users: event.target.value,
              }))
            }
            placeholder={t.bridge.qq.allowedUsersPlaceholder}
          />
          <Button type="button" size="sm" onClick={() => void saveSettings()} disabled={saving}>
            {t.bridge.qq.saveAction}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void probeConnection()}>
            {t.bridge.qq.testAction}
          </Button>
          {probeResult ? (
            <div className="text-muted-foreground text-sm">{probeResult}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
