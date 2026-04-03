import { AutomationJobDetailPage } from "@/components/workspace/automation/automation-job-detail-page";
import { AutomationShell } from "@/components/workspace/automation/automation-shell";

export default async function WorkspaceAutomationTaskDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return (
    <AutomationShell>
      <AutomationJobDetailPage kind="scheduled_task" jobId={jobId} />
    </AutomationShell>
  );
}
