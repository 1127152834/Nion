"use client";

import { useEffect, useState } from "react";

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

type DaemonRuntimeInfoResponse = {
  guardian_mode?: {
    status?: GuardianModeStatus;
  };
};

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

  useEffect(() => {
    let cancelled = false;

    async function loadGuardianStatus() {
      const runtimeInfo = await getDesktopRuntimeInfo();
      const baseUrl = runtimeInfo?.baseUrl?.trim();

      if (!baseUrl) {
        if (!cancelled) {
          setGuardianStatus("offline");
        }
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/daemon/runtime-info`);
        if (!response.ok) {
          throw new Error(`Failed to load daemon runtime info (${response.status})`);
        }
        const payload = (await response.json()) as DaemonRuntimeInfoResponse;
        const nextStatus = payload.guardian_mode?.status;

        if (!cancelled) {
          setGuardianStatus(
            nextStatus === "standing_by" || nextStatus === "busy" || nextStatus === "offline"
              ? nextStatus
              : "offline",
          );
        }
      } catch {
        if (!cancelled) {
          setGuardianStatus("offline");
        }
      }
    }

    void loadGuardianStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SettingsSection
      title={t.settings.daemon.title}
      description={t.settings.daemon.description}
    >
      <div className="space-y-4">
        <GuardianModeStatusCard status={guardianStatus} />
        <div className="flex items-center justify-between rounded-xl border bg-background/80 p-4 shadow-sm">
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {t.settings.daemon.allowBackgroundRunningLabel}
            </div>
            <div className="text-muted-foreground text-sm">
              {t.settings.daemon.allowBackgroundRunningHint}
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
          void onSave();
        }}
      />
    </SettingsSection>
  );
}
