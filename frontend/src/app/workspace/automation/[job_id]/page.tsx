import { EventTaskDetailPage } from "@/components/workspace/automation/event-task-detail-page";

export default async function AutomationEventTaskPage({
  params,
}: {
  params: Promise<{ job_id: string }>;
}) {
  const { job_id } = await params;

  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <EventTaskDetailPage jobId={job_id} />
        </div>
      </div>
    </main>
  );
}
