import { AutomationJobListPage } from "@/components/workspace/automation/automation-job-list-page";
import { AutomationShell } from "@/components/workspace/automation/automation-shell";

export default function WorkspaceAutomationRemindersPage() {
  return (
    <AutomationShell>
      <AutomationJobListPage kind="reminder" />
    </AutomationShell>
  );
}
