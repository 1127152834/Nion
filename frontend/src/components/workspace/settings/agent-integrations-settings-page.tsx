"use client";

import { useI18n } from "@/core/i18n/hooks";

import { SettingsSection } from "./settings-section";

export function AgentIntegrationsSettingsPage() {
  const { t } = useI18n();

  return (
    <SettingsSection
      title={t.settings.agentIntegrations.title}
      description={t.settings.agentIntegrations.description}
    >
      <div className="text-muted-foreground text-sm">
        {t.settings.agentIntegrations.empty}
      </div>
    </SettingsSection>
  );
}
