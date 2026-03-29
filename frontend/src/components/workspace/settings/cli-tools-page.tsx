"use client";

import { CliToolsManager } from "@/components/workspace/cli-tools";
import { SettingsSection } from "@/components/workspace/settings/settings-section";
import { useI18n } from "@/core/i18n/hooks";

export function CLIToolsPage() {
  const { t } = useI18n();
  return (
    <SettingsSection
      title={t.settings.cliTools.title}
      description={t.settings.cliTools.description}
    >
      <CliToolsManager />
    </SettingsSection>
  );
}
