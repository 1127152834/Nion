import { AutomationEventDetailPage } from "@/components/workspace/automation/automation-event-detail-page";

export default async function AutomationEventPage({
  params,
}: {
  params: Promise<{ event_id: string }>;
}) {
  const { event_id } = await params;

  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <AutomationEventDetailPage eventId={event_id} />
        </div>
      </div>
    </main>
  );
}
