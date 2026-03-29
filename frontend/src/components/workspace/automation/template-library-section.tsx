"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  useActivateAutomationTemplate,
  useAutomationTemplates,
  useImportAutomationTemplate,
} from "@/core/automation/hooks";

export function TemplateLibrarySection() {
  const router = useRouter();
  const activateTemplate = useActivateAutomationTemplate();
  const importTemplate = useImportAutomationTemplate();
  const { templates } = useAutomationTemplates();
  const [importPayload, setImportPayload] = useState(
    JSON.stringify(
      {
        manifest: {
          manifest_version: "1",
          job: {
            name: "Imported reply workflow",
            prompt: "Run workflow",
            job_kind: "workflow",
            schedule_kind: "event",
            schedule_value: "agent.run.completed",
            schedule_preset: "event",
            trigger_kind: "event",
            trigger_spec: { event_name: "agent.run.completed" },
            workflow_steps: [
              { id: "step-notify", kind: "notify", config: { title: "Reply finished" } },
              { id: "step-wait", kind: "wait_for_user", config: { prompt: "Continue?" } },
            ],
            delivery_mode: "local",
            delivery_targets: [],
          },
          package: { files: [] },
        },
        files: {},
      },
      null,
      2,
    ),
  );

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Templates</h2>
        <p className="text-sm text-muted-foreground">
          Save and reuse working automations as installable templates.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            const job = await importTemplate.mutateAsync(parseImportPayload(importPayload));
            router.push(job.job_kind === "workflow" ? `/workspace/automation/workflows/${job.id}` : `/workspace/automation/${job.id}`);
          }}
        >
          Import template
        </Button>
      </div>
      {importTemplate.error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm">
          Import failed: {importTemplate.error instanceof Error ? importTemplate.error.message : "Unknown error"}
        </div>
      ) : null}
      {activateTemplate.error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm">
          Activate failed: {activateTemplate.error instanceof Error ? activateTemplate.error.message : "Unknown error"}
        </div>
      ) : null}

      <Textarea
        value={importPayload}
        onChange={(event) => setImportPayload(event.target.value)}
        className="min-h-40 font-mono text-xs"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Official templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 text-sm">
            {templates.official.length === 0 ? (
              <div className="text-muted-foreground">No official templates yet.</div>
            ) : (
              templates.official.map((template) => {
                const name =
                  typeof template.name === "string" && template.name.trim()
                    ? template.name
                    : "Untitled template";
                return (
                  <div key={String(template.id)} className="rounded-md border px-3 py-2">
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">Reusable automation template.</div>
                    <div className="pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          router.push(`/workspace/automation/templates/${String(template.id)}`);
                        }}
                      >
                        View details
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const job = await activateTemplate.mutateAsync(String(template.id));
                          router.push(job.job_kind === "workflow" ? `/workspace/automation/workflows/${job.id}` : `/workspace/automation/${job.id}`);
                        }}
                      >
                        Activate template
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Personal templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 text-sm">
            {templates.personal.length === 0 ? (
              <div className="text-muted-foreground">No personal templates yet.</div>
            ) : (
              templates.personal.map((template) => {
                const name =
                  typeof template.name === "string" && template.name.trim()
                    ? template.name
                    : "Untitled template";

                return (
                  <div key={String(template.id)} className="rounded-md border px-3 py-2">
                    <div className="font-medium">{name}</div>
                    <div className="pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          router.push(`/workspace/automation/templates/${String(template.id)}`);
                        }}
                      >
                        View details
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const job = await activateTemplate.mutateAsync(String(template.id));
                          router.push(job.job_kind === "workflow" ? `/workspace/automation/workflows/${job.id}` : `/workspace/automation/${job.id}`);
                        }}
                      >
                        Activate template
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function parseImportPayload(value: string) {
  try {
    const parsed = JSON.parse(value) as {
      manifest?: Record<string, unknown>;
      files?: Record<string, string>;
    };
    return {
      manifest: parsed.manifest ?? {},
      files: parsed.files ?? {},
    };
  } catch {
    return {
      manifest: {},
      files: {},
    };
  }
}
