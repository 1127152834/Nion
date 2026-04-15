"use client";

import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/core/i18n/hooks";
import { useLocalActionsHistory } from "@/core/local-actions";
import { useGuardianRuntime } from "@/core/runtime/use-guardian-runtime";

import { ConfigValidationErrors } from "./config-validation-errors";
import { ConfigSaveBar } from "./configuration/config-save-bar";
import { GuardianModeStatusCard } from "./guardian-mode-status-card";
import { LocalActionsHistoryCard } from "./local-actions-history-card";
import { LocalActionsPermissionCard } from "./local-actions-permission-card";
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
  const { snapshot, refresh } = useGuardianRuntime();
  const localActionsHistory = useLocalActionsHistory();

  const daemon = ((draftConfig.daemon ?? {}) as Record<string, unknown>);
  const allowBackgroundRunning = Boolean(daemon.allow_background_running);
  const localActionsPermissionMode =
    (daemon.local_actions_permission_mode as
      | "disabled"
      | "review_required"
      | "allow_all"
      | undefined) ?? "review_required";
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

  return (
    <SettingsSection
      title={t.settings.daemon.guardianTitle}
      description={t.settings.daemon.guardianDescription}
    >
      <div className="space-y-4">
        <GuardianModeStatusCard
          copy={guardianStatusCopy}
          status={snapshot.guardianStatus}
        />
        <LocalActionsPermissionCard
          value={localActionsPermissionMode}
          onChange={(next) =>
            onConfigChange({
              ...draftConfig,
              daemon: {
                ...daemon,
                local_actions_permission_mode: next,
              },
            })
          }
          copy={{
            title: t.settings.daemon.localActionsPermissionTitle,
            description: t.settings.daemon.localActionsPermissionDescription,
            disabled: t.settings.daemon.localActionsPermissionDisabled,
            reviewRequired:
              t.settings.daemon.localActionsPermissionReviewRequired,
            allowAll: t.settings.daemon.localActionsPermissionAllowAll,
          }}
        />
        {!localActionsHistory.isLoading &&
        !localActionsHistory.error &&
        localActionsHistory.data?.items?.length ? (
          <LocalActionsHistoryCard items={localActionsHistory.data.items} />
        ) : null}
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
              void refresh();
            }
          });
        }}
      />
    </SettingsSection>
  );
}
