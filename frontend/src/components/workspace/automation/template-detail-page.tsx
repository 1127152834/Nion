"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivateAutomationTemplate, useAutomationTemplate } from "@/core/automation/hooks";

export function TemplateDetailPage({ templateId }: { templateId: string }) {
  const router = useRouter();
  const { template, isLoading, error } = useAutomationTemplate(templateId);
  const activateTemplate = useActivateAutomationTemplate();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading template…</div>;
  }

  if (!template || error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
        {error instanceof Error ? error.message : "Template not found."}
      </div>
    );
  }

  const manifest = (template.manifest as Record<string, unknown>) ?? {};
  const jobPayload = (manifest.job as Record<string, unknown>) ?? {};
  const templateName =
    typeof template.name === "string" && template.name.trim() ? template.name : "Template";
  const manifestVersion =
    typeof manifest.manifest_version === "string" && manifest.manifest_version.trim()
      ? manifest.manifest_version
      : "unknown";
  const jobKindLabel =
    typeof jobPayload.job_kind === "string" && jobPayload.job_kind.trim()
      ? jobPayload.job_kind
      : "unknown";
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{templateName}</h1>
      </header>

      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle>Template manifest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-5 pb-5 text-sm">
          <div>manifest_version: {manifestVersion}</div>
          <div>job_kind: {jobKindLabel}</div>
          <pre className="overflow-x-auto rounded-md border bg-muted/20 p-3 text-[11px] text-muted-foreground">
            {JSON.stringify(template.manifest, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={async () => {
            const job = await activateTemplate.mutateAsync(templateId);
            router.push(job.job_kind === "workflow" ? `/workspace/automation/workflows/${job.id}` : `/workspace/automation/${job.id}`);
          }}
        >
          Activate template
        </Button>
      </div>
    </section>
  );
}
