"use client";

import { useCallback, useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { getDesktopRuntimeInfo } from "@/core/api/desktop-client";
import { useI18n } from "@/core/i18n/hooks";

import { ConfigValidationErrors } from "./config-validation-errors";
import { ConfigSaveBar } from "./configuration/config-save-bar";
import {
  GuardianModeStatusCard,
  type GuardianModeStatus,
} from "./guardian-mode-status-card";
import { SettingsSection } from "./settings-section";
import { useConfigEditor } from "./use-config-editor";

export function DaemonSettingsPage() {
  const { t } = useI18n();
  const {
    draftConfig,
    validationErrors,
    validationWarnings,
    dirty,
    disabled,
    saving,
    onConfigChange,
    onDiscard,
    onSave,
  } = useConfigEditor();
  const [guardianStatus, setGuardianStatus] = useState<GuardianModeStatus>("offline");

  const daemon = ((draftConfig.daemon ?? {}) as Record<string, unknown>);
  const allowBackgroundRunning = Boolean(daemon.allow_background_running);
  const guardianStatusCopy = {
    title: t.settings.daemon.guardianStatusTitle,
    labels: {
      standing_by: t.settings.daemon.guardianStatusLabels.standingBy,
      busy: t.settings.daemon.guardianStatusLabels.busy,
      offline: t.settings.daemon.guardianStatusLabels.offline,
    },
    descriptions: {
      standing_by: t.settings.daemon.guardianStatusDescriptions.standingBy,
      busy: t.settings.daemon.guardianStatusDescriptions.busy,
      offline: t.settings.daemon.guardianStatusDescriptions.offline,
    },
  } satisfies Parameters<typeof GuardianModeStatusCard>[0]["copy"];

  const loadGuardianStatus = useCallback(async () => {
    const runtimeInfo = await getDesktopRuntimeInfo();
    setGuardianStatus(runtimeInfo?.guardianMode.status ?? "offline");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncGuardianStatus() {
      const runtimeInfo = await getDesktopRuntimeInfo();
      if (cancelled) {
        return;
      }
      setGuardianStatus(runtimeInfo?.guardianMode.status ?? "offline");
    }

    void syncGuardianStatus();

    return () => {
      cancelled = true;
    };
  }, [loadGuardianStatus]);

  return (
    <SettingsSection
      title={t.settings.daemon.guardianTitle}
      description={t.settings.daemon.guardianDescription}
    >
      <div className="space-y-4">
        <GuardianModeStatusCard copy={guardianStatusCopy} status={guardianStatus} />
        <div className="flex items-center justify-between rounded-xl border bg-background/80 p-4 shadow-sm">
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {t.settings.daemon.guardianBackgroundLabel}
            </div>
            <div className="text-muted-foreground text-sm">
              {t.settings.daemon.guardianBackgroundHint}
            </div>
          </div>
          <Switch
            checked={allowBackgroundRunning}
            onCheckedChange={(checked) =>
              onConfigChange({
                ...draftConfig,
                daemon: {
                  ...daemon,
                  allow_background_running: checked,
                },
              })
            }
          />
        </div>
      </div>
      <ConfigValidationErrors
        errors={validationErrors}
        warnings={validationWarnings}
      />
      <ConfigSaveBar
        dirty={dirty}
        disabled={disabled}
        saving={saving}
        onDiscard={onDiscard}
        onSave={() => {
          void onSave().then((saved) => {
            if (saved) {
              void loadGuardianStatus();
            }
          });
        }}
      />
    </SettingsSection>
  );
}
