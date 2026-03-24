"use client";

import { SquareTerminalIcon, TriangleAlertIcon } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useCLIConfig, useUpdateCLIConfigItem } from "@/core/cli";
import type { CLIStateConfig } from "@/core/cli";
import {
  buildCliToolsCopy,
  localizeCliApiError,
  resolveCliDescription,
} from "@/core/cli/presentation";
import { useI18n } from "@/core/i18n/hooks";

import { SettingsSection } from "./settings-section";

type CliToolsCopy = ReturnType<typeof buildCliToolsCopy>;

function sourceLabel(item: CLIStateConfig, copy: CliToolsCopy): string {
  if (item.configured) {
    return copy.configured;
  }
  return copy.hostDetected;
}

export function CLIToolsPage() {
  const { t } = useI18n();
  const { config, isLoading, error } = useCLIConfig();
  const updateCLI = useUpdateCLIConfigItem();

  const copy: CliToolsCopy = useMemo(
    () => buildCliToolsCopy(t.settings.cliTools),
    [t.settings.cliTools],
  );

  const clis = useMemo(
    () =>
      Object.values(config?.clis ?? {}).sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    [config?.clis],
  );

  return (
    <SettingsSection title={copy.title} description={copy.description}>
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div className="text-destructive text-sm">
          {error instanceof Error
            ? localizeCliApiError(error, t.settings.cliTools)
            : copy.loadFailed}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {copy.runtimeHint}
          </div>

          <div className="rounded-md border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-sm">
            <div className="flex items-start gap-2">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div>{copy.composerHint}</div>
            </div>
          </div>

          {clis.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-sm">
              {copy.empty}
            </div>
          ) : (
            <div className="space-y-3">
              {clis.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border bg-background/80 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <SquareTerminalIcon className="size-4" />
                        <div className="text-sm font-semibold">{item.id}</div>
                        <Badge variant={item.enabled ? "default" : "secondary"}>
                          {item.enabled ? copy.enabled : copy.disabled}
                        </Badge>
                        <Badge variant={item.installed ? "outline" : "destructive"}>
                          {item.installed ? copy.installed : copy.missing}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {resolveCliDescription(item, t.settings.cliTools)}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                        <span>
                          {copy.sourceLabel}: {sourceLabel(item, copy)}
                        </span>
                        <span>
                          {copy.pathLabel}: {item.path ?? "-"}
                        </span>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={item.allowed}
                        disabled={updateCLI.isPending}
                        onCheckedChange={(checked) => {
                          void updateCLI
                            .mutateAsync({
                              cliId: item.id,
                              payload: {
                                enabled: checked,
                                description: item.description,
                              },
                            })
                            .catch((err) => {
                              toast.error(
                                err instanceof Error
                                  ? localizeCliApiError(err, t.settings.cliTools)
                                  : copy.saveFailed,
                              );
                            });
                        }}
                      />
                      {copy.enabled}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SettingsSection>
  );
}
