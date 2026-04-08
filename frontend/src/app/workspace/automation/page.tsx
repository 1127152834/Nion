import { AutomationPage } from "@/components/workspace/automation/automation-page";
import { AutomationShell } from "@/components/workspace/automation/automation-shell";

export default function WorkspaceAutomationPage() {
  return (
    <AutomationShell>
      <AutomationPage />
    </AutomationShell>
  );
}
