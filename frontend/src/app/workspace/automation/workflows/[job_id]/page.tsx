import { WorkflowDetailPage } from "@/components/workspace/automation/workflow-detail-page";

export default async function WorkspaceWorkflowDetailPage({
  params,
}: {
  params: Promise<{ job_id: string }>;
}) {
  const { job_id } = await params;

  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
          <WorkflowDetailPage jobId={job_id} />
        </div>
      </div>
    </main>
  );
}
