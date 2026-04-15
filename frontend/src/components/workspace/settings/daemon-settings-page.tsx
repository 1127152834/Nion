"use client";

import { useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { getDesktopRuntimeInfo } from "@/core/api/desktop-client";

import { ConfigValidationErrors } from "./config-validation-errors";
import { ConfigSaveBar } from "./configuration/config-save-bar";
import {
  GuardianModeStatusCard,
  type GuardianModeStatus,
} from "./guardian-mode-status-card";
import { SettingsSection } from "./settings-section";
import { useConfigEditor } from "./use-config-editor";

export function DaemonSettingsPage() {
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
      if (!cancelled) {
        setGuardianStatus(runtimeInfo?.guardianMode.status ?? "offline");
      }
    }

    void loadGuardianStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SettingsSection
      title="Guardian Mode"
      description="Keep the desktop runtime available for remote entry and show its current guardian status."
    >
      <div className="space-y-4">
        <GuardianModeStatusCard status={guardianStatus} />
        <div className="flex items-center justify-between rounded-xl border bg-background/80 p-4 shadow-sm">
          <div className="space-y-1">
            <div className="text-sm font-medium">
              Keep guardian mode running in the background
            </div>
            <div className="text-muted-foreground text-sm">
              When enabled, closing the desktop window keeps guardian mode alive so remote entry remains available.
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
