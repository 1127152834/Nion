"use client";

import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/core/i18n/hooks";

import { ConfigValidationErrors } from "./config-validation-errors";
import { ConfigSaveBar } from "./configuration/config-save-bar";
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

  const daemon = ((draftConfig.daemon ?? {}) as Record<string, unknown>);
  const allowBackgroundRunning = Boolean(daemon.allow_background_running);

  return (
    <SettingsSection
      title={t.settings.daemon.title}
      description={t.settings.daemon.description}
    >
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
