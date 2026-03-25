"use client";

import { useI18n } from "@/core/i18n/hooks";

import { ConfigValidationErrors } from "./config-validation-errors";
import { ConfigSaveBar } from "./configuration/config-save-bar";
import { ToolsSection } from "./configuration/sections/tools-section";
import { SettingsSection } from "./settings-section";
import { useConfigEditor } from "./use-config-editor";

const DEFAULT_TOOL_PAGE_COPY = {
  loadConfigFailed: "Failed to load tool config",
  runtimeTitle: "Tool status",
  runtimeSummary:
    "Shows whether your latest setup is active and whether the tool runtime looks healthy.",
  runtimeStateLabel: "Status",
  runtimeToolsLabel: "Available tools",
  runtimeAttentionLabel: "Attention",
  runtimeHealthy: "None",
  runtimeInSync: "Up to date",
  runtimeOutOfSync: "Needs apply",
} as const;

export function ToolSettingsPage() {
  const { t } = useI18n();
  const settingsLike = t.settings as {
    toolPage?: Partial<typeof DEFAULT_TOOL_PAGE_COPY>;
  };
  const copy: typeof DEFAULT_TOOL_PAGE_COPY = {
    ...DEFAULT_TOOL_PAGE_COPY,
    ...(settingsLike.toolPage ?? {}),
  };

  const {
    draftConfig,
    validationErrors,
    validationWarnings,
    runtimeStatus,
    isLoading,
    error,
    dirty,
    disabled,
    saving,
    onConfigChange,
    onDiscard,
    onSave,
  } = useConfigEditor();
  const runtimeProcesses = Object.values(runtimeStatus?.runtime_processes ?? {});
  const readyProcessCount = runtimeProcesses.filter(
    (info) => (info.status ?? "").toLowerCase() === "ok",
  ).length;
  const runtimeIssueCount =
    runtimeProcesses.filter(
      (info) =>
        (info.status ?? "").toLowerCase() !== "ok" || Boolean(info.reason),
    ).length +
    (runtimeStatus?.warnings?.length ?? 0) +
    (runtimeStatus?.last_error ? 1 : 0);

  return (
    <SettingsSection
      title={t.settings.tools.title}
      description={t.settings.tools.description}
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div className="text-destructive text-sm">
          {error instanceof Error ? error.message : copy.loadConfigFailed}
        </div>
      ) : (
        <div className="space-y-4">
          {runtimeStatus && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">{copy.runtimeTitle}</div>
                <div className="text-muted-foreground text-xs">
                  {copy.runtimeSummary}
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-md border bg-background/80 p-3">
                  <div className="text-muted-foreground">
                    {copy.runtimeStateLabel}
                  </div>
                  <div
                    className={
                      runtimeStatus.is_in_sync
                        ? "mt-1 font-medium text-emerald-700"
                        : "mt-1 font-medium text-amber-700"
                    }
                  >
                    {runtimeStatus.is_in_sync
                      ? copy.runtimeInSync
                      : copy.runtimeOutOfSync}
                  </div>
                </div>
                <div className="rounded-md border bg-background/80 p-3">
                  <div className="text-muted-foreground">
                    {copy.runtimeToolsLabel}
                  </div>
                  <div className="mt-1 font-medium text-foreground">
                    {runtimeStatus.tools_count ??
                      runtimeStatus.loaded_tools?.length ??
                      readyProcessCount}
                  </div>
                </div>
                <div className="rounded-md border bg-background/80 p-3">
                  <div className="text-muted-foreground">
                    {copy.runtimeAttentionLabel}
                  </div>
                  <div className="mt-1 font-medium text-foreground">
                    {runtimeIssueCount > 0
                      ? String(runtimeIssueCount)
                      : copy.runtimeHealthy}
                  </div>
                </div>
              </div>
            </div>
          )}

          <ToolsSection
            config={draftConfig}
            onChange={onConfigChange}
            disabled={disabled}
          />
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
        </div>
      )}
    </SettingsSection>
  );
}
