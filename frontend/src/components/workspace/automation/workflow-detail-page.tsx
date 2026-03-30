"use client";

import { PlayIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  useExportAutomationJobTemplate,
  useAutomationJob,
  useAutomationRuns,
  useResumeWorkflowRun,
  useRunAutomationJob,
  useSaveAutomationTemplate,
} from "@/core/automation/hooks";

function readStepId(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : null;
}

export function WorkflowDetailPage({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { job, isLoading, error } = useAutomationJob(jobId);
  const exportTemplate = useExportAutomationJobTemplate(jobId);
  const { runs } = useAutomationRuns();
  const runJob = useRunAutomationJob();
  const saveTemplate = useSaveAutomationTemplate();
  const resumeWorkflow = useResumeWorkflowRun();
  const [resumePayload, setResumePayload] = useState('{"answer":"continue"}');

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading workflow…</div>;
  }

  if (!job || error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
        {error instanceof Error ? error.message : "Workflow not found."}
      </div>
    );
  }

  const relatedRuns = runs.filter((run) => run.job_id === job.id).slice(0, 5);
  const latestRun = relatedRuns[0] ?? null;
  const steps = Array.isArray(job.workflow_steps) ? job.workflow_steps : [];

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{job.name}</h1>
            <Badge variant="secondary">{job.state}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{job.prompt || "No workflow prompt configured."}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void runJob.mutateAsync(job.id)}>
            <PlayIcon className="size-4" />
            Run now
          </Button>
          <Button
            variant="outline"
            onClick={() => void exportTemplate.mutateAsync()}
            disabled={exportTemplate.isPending}
          >
            Export template
          </Button>
          <Button
            variant="outline"
            disabled={exportTemplate.isPending || saveTemplate.isPending}
            onClick={async () => {
              const templatePackage = await exportTemplate.mutateAsync();
              const template = await saveTemplate.mutateAsync({
                id: `tpl-${job.id}`,
                name: `${job.name} template`,
                scope: "personal",
                manifest: templatePackage.manifest,
                files: templatePackage.files,
              });
              router.push(`/workspace/automation/templates/${template.id}`);
            }}
          >
            Save as template
          </Button>
          {latestRun?.status === "paused" ? (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium">Resume payload</label>
              <Textarea
                value={resumePayload}
                onChange={(event) => setResumePayload(event.target.value)}
                className="min-h-20 w-64 font-mono text-xs"
              />
              <Button
                variant="outline"
                onClick={() =>
                  void resumeWorkflow.mutateAsync({
                    jobId: job.id,
                    runId: latestRun.id,
                    payload: parseResumePayload(resumePayload),
                  })
                }
              >
                Resume workflow
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle>Workflow steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5 text-sm">
          {steps.length === 0 ? (
            <div className="text-muted-foreground">This workflow has no steps yet.</div>
          ) : (
            steps.map((step, index) => {
              const record = step;
              const stepId = readStepId(record, "id") ?? `step-${index + 1}`;
              const kind = readStepId(record, "kind") ?? "unknown";
              return (
                <div key={stepId} className="rounded-md border px-3 py-2">
                  <div className="font-medium">{stepId}</div>
                  <div className="text-xs text-muted-foreground">{kind}</div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle>Recent runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5 text-sm">
          {relatedRuns.length === 0 ? (
            <div className="text-muted-foreground">No workflow runs yet.</div>
          ) : (
            relatedRuns.map((run) => (
              <div key={run.id} className="rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{run.id}</span>
                  <Badge variant="outline">{run.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{run.result_summary}</div>
                {run.status === "paused" ? (
                  <div className="text-xs text-amber-700">Paused at step: {run.current_step_id ?? "unknown"}</div>
                ) : null}
                {run.status === "failed" ? (
                  <div className="text-xs text-red-600">Failed at step: {run.failed_step_id ?? "unknown"}</div>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  current_step_id: {run.current_step_id ?? "none"}
                </div>
                <div className="text-xs text-muted-foreground">
                  failed_step_id: {run.failed_step_id ?? "none"}
                </div>
                <div className="pt-2 text-xs">
                  <div className="font-medium text-foreground/80">step_results</div>
                  {Array.isArray(run.step_results) && run.step_results.length > 0 ? (
                    run.step_results.map((stepResult, index) => {
                      const record = stepResult;
                      return (
                        <div key={`${run.id}-${index}`} className="text-muted-foreground mt-1 rounded border px-2 py-1">
                          <div>step_id: {readStepId(record, "step_id") ?? "unknown"}</div>
                          <div>status: {readStepId(record, "status") ?? "unknown"}</div>
                          <div>attempts: {readNumber(record, "attempts") ?? 0}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-muted-foreground mt-1">No step results</div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function parseResumePayload(resumePayload: string) {
  try {
    const parsed = JSON.parse(resumePayload) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
