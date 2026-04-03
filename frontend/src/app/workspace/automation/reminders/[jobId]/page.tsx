import { AutomationJobDetailPage } from "@/components/workspace/automation/automation-job-detail-page";
import { AutomationShell } from "@/components/workspace/automation/automation-shell";

export default async function WorkspaceAutomationReminderDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return (
    <AutomationShell>
      <AutomationJobDetailPage kind="reminder" jobId={jobId} />
    </AutomationShell>
  );
}
