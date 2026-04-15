"use client";

import { useI18n } from "@/core/i18n/hooks";
import { useModels } from "@/core/models/hooks";

import { ConfigValidationErrors } from "./config-validation-errors";
import { ConfigSaveBar } from "./configuration/config-save-bar";
import { AttachmentsSection } from "./configuration/sections/attachments-section";
import { SubagentsSection } from "./configuration/sections/subagents-section";
import { SuggestionsSection } from "./configuration/sections/suggestions-section";
import { SummarizationSection } from "./configuration/sections/summarization-section";
import { TitleSection } from "./configuration/sections/title-section";
import { normalizeSessionPolicyConfig } from "./session-policy-model-selection";
import { SettingsSection } from "./settings-section";
import { useConfigEditor } from "./use-config-editor";

export function SessionPolicySettingsPage() {
  const { t } = useI18n();
  const { models } = useModels();
  const availableModelNames = models.map((model) => model.name.trim());
  const {
    draftConfig,
    validationErrors,
    validationWarnings,
    isLoading,
    error,
    dirty,
    disabled,
    saving,
    onConfigChange,
    onDiscard,
    onSave,
  } = useConfigEditor({
    prepareConfig: (config) =>
      normalizeSessionPolicyConfig(config, availableModelNames),
  });

  return (
    <SettingsSection
      title={t.settings.sessionPolicy.title}
      description={t.settings.sessionPolicy.description}
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div className="text-destructive text-sm">
          {error instanceof Error ? error.message : "Failed to load config"}
        </div>
      ) : (
        <div className="space-y-4">
          <AttachmentsSection
            config={draftConfig}
            onChange={onConfigChange}
            disabled={disabled}
          />
          <SuggestionsSection
            config={draftConfig}
            onChange={onConfigChange}
            disabled={disabled}
          />
          <TitleSection
            config={draftConfig}
            onChange={onConfigChange}
            disabled={disabled}
          />
          <SummarizationSection
            config={draftConfig}
            onChange={onConfigChange}
            disabled={disabled}
          />
          <SubagentsSection
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
