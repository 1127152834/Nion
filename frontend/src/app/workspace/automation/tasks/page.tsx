import { AutomationJobListPage } from "@/components/workspace/automation/automation-job-list-page";
import { AutomationShell } from "@/components/workspace/automation/automation-shell";

export default function WorkspaceAutomationTasksPage() {
  return (
    <AutomationShell>
      <AutomationJobListPage kind="scheduled_task" />
    </AutomationShell>
  );
}
