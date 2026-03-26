"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";

import { getBridgeClient } from "@/core/bridge/client";

type DiscordBridgeSettings = {
  bridge_discord_bot_token: string;
};

const DEFAULT_SETTINGS: DiscordBridgeSettings = {
  bridge_discord_bot_token: "",
};

export function DiscordBridgeSection() {
  const client = getBridgeClient();
  const { t } = useI18n();
  const [settings, setSettings] = useState<DiscordBridgeSettings>(DEFAULT_SETTINGS);
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
    const result = await client.probe("discord");
    setProbeResult(result.message);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-lg border p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t.bridge.discord.title}</h2>
          <p className="text-muted-foreground text-sm">
            {t.bridge.discord.description}
          </p>
        </div>
        <div className="mt-4 grid gap-3">
          <Input
            value={settings.bridge_discord_bot_token}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                bridge_discord_bot_token: event.target.value,
              }))
            }
            placeholder={t.bridge.discord.botTokenPlaceholder}
            type="password"
          />
          <Button type="button" size="sm" onClick={() => void saveSettings()} disabled={saving}>
            {t.bridge.discord.saveAction}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void probeConnection()}>
            {t.bridge.discord.testAction}
          </Button>
          {probeResult ? (
            <div className="text-muted-foreground text-sm">{probeResult}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
