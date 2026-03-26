"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getBridgeClient } from "@/core/bridge/client";

type FeishuBridgeSettings = {
  bridge_feishu_app_id: string;
  bridge_feishu_app_secret: string;
  bridge_feishu_domain: string;
};

const DEFAULT_SETTINGS: FeishuBridgeSettings = {
  bridge_feishu_app_id: "",
  bridge_feishu_app_secret: "",
  bridge_feishu_domain: "feishu",
};

export function FeishuBridgeSection() {
  const client = getBridgeClient();
  const { t } = useI18n();
  const [settings, setSettings] = useState<FeishuBridgeSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [probeResult, setProbeResult] = useState<string>("");

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
    const result = await client.probe("feishu");
    setProbeResult(result.message);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-lg border p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t.bridge.feishu.title}</h2>
          <p className="text-muted-foreground text-sm">
            {t.bridge.feishu.description}
          </p>
        </div>
        <div className="mt-4 grid gap-3">
          <Input
            value={settings.bridge_feishu_app_id}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                bridge_feishu_app_id: event.target.value,
              }))
            }
            placeholder={t.bridge.feishu.appIdPlaceholder}
          />
          <Input
            value={settings.bridge_feishu_app_secret}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                bridge_feishu_app_secret: event.target.value,
              }))
            }
            placeholder={t.bridge.feishu.appSecretPlaceholder}
            type="password"
          />
          <Select
            value={settings.bridge_feishu_domain}
            onValueChange={(value) =>
              setSettings((current) => ({
                ...current,
                bridge_feishu_domain: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feishu">{t.bridge.feishu.domainFeishu}</SelectItem>
              <SelectItem value="lark">{t.bridge.feishu.domainLark}</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="sm" onClick={() => void saveSettings()} disabled={saving}>
            {t.bridge.feishu.saveAction}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void probeConnection()}>
            {t.bridge.feishu.testAction}
          </Button>
          {probeResult ? (
            <div className="text-muted-foreground text-sm">{probeResult}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
