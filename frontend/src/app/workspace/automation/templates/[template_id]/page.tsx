import { TemplateDetailPage } from "@/components/workspace/automation/template-detail-page";

export default async function WorkspaceTemplateDetailPage({
  params,
}: {
  params: Promise<{ template_id: string }>;
}) {
  const { template_id } = await params;

  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
          <TemplateDetailPage templateId={template_id} />
        </div>
      </div>
    </main>
  );
}
