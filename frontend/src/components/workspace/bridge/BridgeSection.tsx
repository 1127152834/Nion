"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/core/i18n/hooks";

import {
  createBridgeClient,
  getBridgeClient,
  type BridgeStatus,
} from "@/core/bridge/client";

type BridgeSettings = {
  bridge_telegram_enabled: string;
  bridge_feishu_enabled: string;
  bridge_discord_enabled: string;
  bridge_qq_enabled: string;
  bridge_weixin_enabled: string;
};

const DEFAULT_SETTINGS: BridgeSettings = {
  bridge_telegram_enabled: "",
  bridge_feishu_enabled: "",
  bridge_discord_enabled: "",
  bridge_qq_enabled: "",
  bridge_weixin_enabled: "",
};

const PLATFORM_KEYS: Array<
  readonly [string, keyof Pick<
    BridgeSettings,
    | "bridge_telegram_enabled"
    | "bridge_feishu_enabled"
    | "bridge_discord_enabled"
    | "bridge_qq_enabled"
    | "bridge_weixin_enabled"
  >]
> = [
  ["Telegram", "bridge_telegram_enabled"],
  ["Feishu", "bridge_feishu_enabled"],
  ["Discord", "bridge_discord_enabled"],
  ["QQ", "bridge_qq_enabled"],
  ["Weixin", "bridge_weixin_enabled"],
];

function toBool(value: string) {
  return value === "true";
}

export function BridgeSection() {
  const client = getBridgeClient();
  const { t } = useI18n();
  const [settings, setSettings] = useState<BridgeSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<BridgeStatus>({
    running: false,
    enabledPlatforms: [],
    adapters: [],
  });
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!client) {
      return;
    }
    void client.getSettings().then((next) => {
      setSettings((current) => ({ ...current, ...next }));
    });
    void client.getStatus().then(setStatus);
  }, [client]);

  if (!client) {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">{t.bridge.overview.title}</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {t.bridge.desktopOnly}
        </p>
      </section>
    );
  }

  const enabledCount = useMemo(
    () => [
      settings.bridge_telegram_enabled,
      settings.bridge_feishu_enabled,
      settings.bridge_discord_enabled,
      settings.bridge_qq_enabled,
      settings.bridge_weixin_enabled,
    ].filter((value) => value === "true").length,
    [settings],
  );

  const saveSettings = async (updates: Partial<BridgeSettings>) => {
    setSaving(true);
    const client = createBridgeClient();
    const next = { ...settings, ...updates };
    await client.saveSettings(updates);
    setSettings(next);
    setStatus(await client.getStatus());
    setSaving(false);
  };

  const startBridge = async () => {
    setWorking(true);
    const client = createBridgeClient();
    await client.start();
    setStatus(await client.getStatus());
    setWorking(false);
  };

  const stopBridge = async () => {
    setWorking(true);
    const client = createBridgeClient();
    await client.stop();
    setStatus(await client.getStatus());
    setWorking(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-lg border p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Bridge</h2>
          <p className="text-muted-foreground text-sm">
            {t.bridge.overview.description}
          </p>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t.bridge.overview.statusTitle}</h3>
          <p className="text-muted-foreground text-xs">
            {t.bridge.overview.statusDescription}
          </p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground text-xs">{t.bridge.overview.runtimeLabel}</div>
            <div className="mt-1 text-sm font-medium">
              {status.running ? t.bridge.overview.running : t.bridge.overview.stopped}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground text-xs">{t.bridge.overview.enabledPlatformsLabel}</div>
            <div className="mt-1 text-sm font-medium">{enabledCount}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground text-xs">{t.bridge.overview.activePlatformsLabel}</div>
            <div className="mt-1 text-sm font-medium">
              {status.adapters.filter((adapter) => adapter.running).length}
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {status.adapters.map((adapter) => (
            <div
              key={adapter.platform}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className="font-medium">{adapter.platform}</span>
              <span className="text-muted-foreground">
                {adapter.running ? t.bridge.overview.running : t.bridge.overview.stopped}
                {adapter.error ? ` · ${adapter.error}` : ""}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="button" size="sm" onClick={() => void startBridge()} disabled={working}>
            {t.bridge.overview.startAction}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void stopBridge()} disabled={working}>
            {t.bridge.overview.stopAction}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t.bridge.overview.channelsTitle}</h3>
          <p className="text-muted-foreground text-xs">
            {t.bridge.overview.channelsDescription}
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {PLATFORM_KEYS.map(([label, key]) => (
            <label key={key} className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium">{label}</div>
              <Switch
                checked={toBool(settings[key])}
                onCheckedChange={(checked) =>
                  void saveSettings({
                    [key]: checked ? "true" : "",
                  } as Partial<BridgeSettings>)
                }
                disabled={saving}
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
