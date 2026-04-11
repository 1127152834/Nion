"use client";

import { SettingsSection } from "@/components/workspace/settings/settings-section";
import { UserIdentityPanel } from "@/components/workspace/settings/user-identity-panel";

export function IdentitySettingsPage() {
  return (
    <SettingsSection
      title="身份"
      description="告诉助手如何称呼你，以及哪些长期背景应该一直带着。"
    >
      <UserIdentityPanel />
    </SettingsSection>
  );
}
