"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getBridgeClient } from "@/core/bridge/client";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

import { FieldTip } from "../field-tip";
import {
  asBoolean,
  asObject,
  asString,
  cloneConfig,
  type ConfigDraft,
  toInputValue,
} from "../shared";

function getSandboxMode(useValue: string): "local" | "aio" | "custom" {
  if (useValue.includes("LocalSandboxProvider")) {
    return "local";
  }
  if (useValue.includes("AioSandboxProvider")) {
    return "aio";
  }
  return "custom";
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getHostWorkdirConfigValue(config: ConfigDraft): string {
  const runtime = asObject(config.runtime);
  return asString(runtime.default_host_workdir);
}

export function SandboxSection({
  config,
  onChange,
  disabled,
  isDesktopShell = false,
}: {
  config: ConfigDraft;
  onChange: (next: ConfigDraft) => void;
  disabled?: boolean;
  isDesktopShell?: boolean;
}) {
  const { t, locale } = useI18n();
  const settingsLike = t.settings as {
    configSections?: {
      sandbox?: Record<string, string>;
    };
  };
  const copy =
    (settingsLike.configSections?.sandbox ?? {}) as Record<
      string,
      string | undefined
    >;
  const sandbox = asObject(config.sandbox);
  const sandboxUse = asString(sandbox.use);
  const sandboxMode = getSandboxMode(sandboxUse);
  const currentProviderIsAio = sandboxMode === "aio";
  const showDesktopAioWarning = isDesktopShell && currentProviderIsAio;
  const selectedMode = showDesktopAioWarning ? "unsupported" : sandboxMode;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const strictModeEnabled = asBoolean(sandbox.strict_mode, false);
  const strictModeTip =
    locale === "zh-CN"
      ? (copy.strictModeTipZh ?? "")
      : (copy.strictModeTipEn ?? "");
  const hostWorkdir = getHostWorkdirConfigValue(config);

  const updateSandbox = (key: string, value: unknown) => {
    const next = cloneConfig(config);
    const target = asObject(next.sandbox);
    if (value === undefined || value === null || value === "") {
      delete target[key];
    } else {
      target[key] = value;
    }
    next.sandbox = target;
    onChange(next);
  };

  const updateSandboxBatch = (updates: Record<string, unknown>) => {
    const next = cloneConfig(config);
    const target = asObject(next.sandbox);

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null || value === "") {
        delete target[key];
      } else {
        target[key] = value;
      }
    }

    next.sandbox = target;
    onChange(next);
  };

  const updateSandboxNumber = (key: string, raw: string) => {
    updateSandbox(key, parseOptionalNumber(raw));
  };

  const updateHostWorkdir = (value: string) => {
    const next = cloneConfig(config);
    const runtime = asObject(next.runtime);
    if (!value.trim()) {
      delete runtime.default_host_workdir;
    } else {
      runtime.default_host_workdir = value.trim();
    }
    next.runtime = runtime;
    onChange(next);
  };

  const browseHostWorkdir = async () => {
    const bridge = getBridgeClient();
    if (!bridge) {
      return;
    }
    const selected = await bridge.browseWorkingDirectory(hostWorkdir || undefined);
    if (selected) {
      updateHostWorkdir(selected);
    }
  };

  const switchSandboxMode = (
    mode: "local" | "aio" | "custom" | "unsupported",
  ) => {
    if (mode === "local") {
      updateSandboxBatch({
        use: "nion.sandbox.local:LocalSandboxProvider",
        strict_mode: undefined,
      });
      return;
    }
    if (mode === "aio") {
      if (isDesktopShell) {
        return;
      }
      updateSandbox("use", "nion.community.aio_sandbox:AioSandboxProvider");
      return;
    }
    if (mode === "custom") {
      updateSandboxBatch({
        use: "",
        strict_mode: undefined,
      });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="space-y-1">
          <div className="text-sm font-medium">{copy.title}</div>
          <div className="text-muted-foreground text-xs">{copy.subtitle}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium">{copy.mode}</div>
          <Select value={selectedMode} onValueChange={switchSandboxMode}>
            <SelectTrigger disabled={disabled} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">{copy.local}</SelectItem>
              {!isDesktopShell ? (
                <SelectItem value="aio">{copy.aio}</SelectItem>
              ) : null}
              <SelectItem value="custom">{copy.custom}</SelectItem>
              {showDesktopAioWarning ? (
                <SelectItem value="unsupported" disabled>
                  {copy.desktopUnsupportedCurrent}
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      </div>

      <FieldTip zh={copy.modeTipZh ?? ""} en={copy.modeTipEn ?? ""} />

      {showDesktopAioWarning ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-medium">{copy.desktopUnsupportedTitle}</div>
          <div className="mt-1 leading-relaxed">
            {copy.desktopUnsupportedHint}
          </div>
        </div>
      ) : null}

      {!isDesktopShell ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_220px] md:items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium">{copy.strictMode}</div>
              {strictModeTip ? (
                <div className="text-muted-foreground text-xs leading-relaxed">
                  {strictModeTip}
                </div>
              ) : null}
            </div>
            <div className="flex justify-end">
              <Switch
                checked={strictModeEnabled}
                onCheckedChange={(checked) => {
                  setAdvancedOpen(false);
                  if (checked) {
                    updateSandboxBatch({
                      strict_mode: true,
                      use: "nion.community.aio_sandbox:AioSandboxProvider",
                    });
                    return;
                  }
                  updateSandbox("strict_mode", undefined);
                }}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ) : null}

      {selectedMode === "custom" && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium">{copy.usePath}</div>
          <Input
            value={sandboxUse}
            placeholder={copy.usePathPlaceholder}
            onChange={(e) => updateSandbox("use", e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      {selectedMode === "aio" && !isDesktopShell && (
        <>
          {copy.aioDefaultsHint ? (
            <div className="text-muted-foreground text-xs leading-relaxed">
              {copy.aioDefaultsHint}
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={asBoolean(sandbox.auto_start, true)}
              onCheckedChange={(checked) => updateSandbox("auto_start", checked)}
              disabled={disabled}
            />
            {copy.autoStart}
          </label>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
              >
                <ChevronDownIcon
                  className={cn(
                    "size-3.5 transition-transform",
                    advancedOpen && "rotate-180",
                  )}
                />
                {copy.advanced}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium">{copy.image}</div>
                  <Input
                    value={asString(sandbox.image)}
                    placeholder={copy.imagePlaceholder}
                    onChange={(e) => updateSandbox("image", e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium">{copy.port}</div>
                  <Input
                    type="number"
                    value={toInputValue(sandbox.port)}
                    placeholder="8080"
                    onChange={(e) => updateSandboxNumber("port", e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium">{copy.baseUrl}</div>
                  <Input
                    value={asString(sandbox.base_url)}
                    placeholder={copy.baseUrlPlaceholder}
                    onChange={(e) => updateSandbox("base_url", e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium">{copy.containerPrefix}</div>
                  <Input
                    value={asString(sandbox.container_prefix)}
                    placeholder="nion-sandbox"
                    onChange={(e) => updateSandbox("container_prefix", e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-medium">{copy.idleTimeout}</div>
                  <Input
                    type="number"
                    value={toInputValue(sandbox.idle_timeout)}
                    placeholder="600"
                    onChange={(e) =>
                      updateSandboxNumber("idle_timeout", e.target.value)
                    }
                    disabled={disabled}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {selectedMode === "custom" && (
        <div className="text-muted-foreground text-xs">
          {copy.customConfiguredHint}
        </div>
      )}

      {isDesktopShell ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_220px] md:items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium">{copy.hostWorkdir}</div>
              <div className="text-muted-foreground text-xs leading-relaxed">
                {copy.hostWorkdirHint}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm transition-colors"
                onClick={() => {
                  void browseHostWorkdir();
                }}
                disabled={disabled}
              >
                {copy.browseHostWorkdir}
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="text-xs font-medium">{copy.hostWorkdirPath}</div>
            <Input
              value={hostWorkdir}
              placeholder={copy.hostWorkdirPlaceholder}
              onChange={(e) => updateHostWorkdir(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
