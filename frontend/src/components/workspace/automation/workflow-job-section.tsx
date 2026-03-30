"use client";

import { PauseIcon, PlayIcon, Trash2Icon, ZapIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import { useResumeWorkflowRun } from "@/core/automation/hooks";
import type { AutomationJob, AutomationRun } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type WorkflowJobSectionProps = {
  title: string;
  description: string;
  emptyMessage: string;
  jobs: AutomationJob[];
  runs: AutomationRun[];
  onPause: (jobId: string) => Promise<unknown>;
  onResume: (jobId: string) => Promise<unknown>;
  onRun: (jobId: string) => Promise<unknown>;
  onRemove: (jobId: string) => Promise<unknown>;
  onRequestApproval?: (jobId: string) => Promise<unknown>;
};

export function WorkflowJobSection({
  title,
  description,
  emptyMessage,
  jobs,
  runs,
  onPause,
  onResume,
  onRun,
  onRemove,
}: WorkflowJobSectionProps) {
  const { t } = useI18n();
  const copy = t.settings.automation;
  const resumeWorkflow = useResumeWorkflowRun();

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {jobs.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
          {emptyMessage}
        </div>
      ) : (
        <ItemGroup className="gap-3">
          {jobs.map((job) => {
            const latestRun = runs.find((run) => run.job_id === job.id) ?? null;
            return (
              <Item
                key={job.id}
                variant="outline"
                className="items-start gap-4 rounded-xl"
              >
                <ItemContent className="w-full">
                  <ItemHeader className="items-start">
                    <div className="space-y-2">
                      <ItemTitle>
                        <span>{job.name}</span>
                        <Badge variant="secondary">{copy.stateLabels[job.state] ?? job.state}</Badge>
                        {latestRun ? <Badge variant="outline">Latest run: {latestRun.status}</Badge> : null}
                      </ItemTitle>
                      <ItemDescription>{job.prompt}</ItemDescription>
                    </div>
                    <ItemActions className="flex-wrap justify-end">
                      {job.state === "paused" ? (
                        <Button size="sm" variant="outline" onClick={() => void onResume(job.id)}>
                          <PlayIcon className="size-4" />
                          {copy.resume}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => void onPause(job.id)}>
                          <PauseIcon className="size-4" />
                          {copy.pause}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => void onRun(job.id)}>
                        <ZapIcon className="size-4" />
                        {copy.runNow}
                      </Button>
                      {latestRun?.status === "paused" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void resumeWorkflow.mutateAsync({
                              jobId: job.id,
                              runId: latestRun.id,
                              payload: { answer: "continue" },
                            })
                          }
                        >
                          Resume workflow
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => void onRemove(job.id)}>
                        <Trash2Icon className="size-4" />
                        {copy.remove}
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/workspace/automation/workflows/${job.id}`}>View details</Link>
                      </Button>
                    </ItemActions>
                  </ItemHeader>

                  {latestRun ? (
                    <div className="text-muted-foreground grid gap-3 pt-3 text-xs md:grid-cols-3">
                      <div>
                        <div className="font-medium text-foreground/80">Latest run</div>
                        <div>{latestRun.id}</div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground/80">current_step_id</div>
                        <div>{latestRun.current_step_id ?? "none"}</div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground/80">failed_step_id</div>
                        <div>{latestRun.failed_step_id ?? "none"}</div>
                      </div>
                    </div>
                  ) : null}
                </ItemContent>
              </Item>
            );
          })}
        </ItemGroup>
      )}
    </section>
  );
}
