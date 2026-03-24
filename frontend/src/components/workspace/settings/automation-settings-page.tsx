"use client";

import { Clock3Icon, PauseIcon, PlayIcon, PlusIcon, RefreshCwIcon, Trash2Icon, ZapIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  useAutomationJobs,
  useAutomationRuns,
  useAutomationStatus,
  useCreateAutomationJob,
  usePauseAutomationJob,
  useRemoveAutomationJob,
  useResumeAutomationJob,
  useRunAutomationJob,
} from "@/core/automation/hooks";
import type { AutomationDeliveryMode, AutomationScheduleKind } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

import { SettingsSection } from "./settings-section";

export function AutomationSettingsPage() {
  const { t } = useI18n();
  const { jobs, isLoading: jobsLoading, error: jobsError } = useAutomationJobs();
  const { runs, isLoading: runsLoading, error: runsError } = useAutomationRuns();
  const { status } = useAutomationStatus();
  const createJob = useCreateAutomationJob();
  const pauseJob = usePauseAutomationJob();
  const resumeJob = useResumeAutomationJob();
  const runJob = useRunAutomationJob();
  const removeJob = useRemoveAutomationJob();

  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [scheduleKind, setScheduleKind] = useState<AutomationScheduleKind>("interval");
  const [scheduleValue, setScheduleValue] = useState("900");
  const [deliveryMode, setDeliveryMode] = useState<AutomationDeliveryMode>("local");
  const [skillsText, setSkillsText] = useState("");

  const copy = t.settings.automation;
  const scheduleHelp = useMemo(
    () => copy.scheduleHelp[scheduleKind],
    [copy.scheduleHelp, scheduleKind],
  );

  const stateLabels = copy.stateLabels;

  async function handleCreate() {
    if (!name.trim() || !prompt.trim() || !scheduleValue.trim()) {
      return;
    }
    await createJob.mutateAsync({
      name: name.trim(),
      prompt: prompt.trim(),
      schedule_kind: scheduleKind,
      schedule_value: scheduleValue.trim(),
      delivery_mode: deliveryMode,
      delivery_targets: [],
      skills: skillsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    setName("");
    setPrompt("");
    setSkillsText("");
    if (scheduleKind === "interval") {
      setScheduleValue("900");
    }
  }

  const firstError = jobsError ?? runsError ?? createJob.error;

  return (
    <SettingsSection
      title={copy.title}
      description={copy.description}
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <StatusCard
            icon={RefreshCwIcon}
            label={copy.scheduler}
            value={status?.scheduler_running ? copy.schedulerRunning : copy.schedulerIdle}
          />
          <StatusCard
            icon={Clock3Icon}
            label={copy.jobs}
            value={String(status?.total_jobs_count ?? jobs.length)}
          />
          <StatusCard
            icon={ZapIcon}
            label={copy.runs}
            value={String(status?.run_count ?? runs.length)}
          />
        </div>
        {status ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4 text-sm">
              <div className="font-medium">{copy.diagnostics}</div>
              <div className="text-muted-foreground mt-2 space-y-1">
                <div>{copy.jobs}: {status.total_jobs_count}</div>
                <div>{copy.scheduler}: {status.active_jobs_count}</div>
                <div>{copy.pause}: {status.paused_jobs_count}</div>
                <div>{copy.stateLabels.error}: {status.error_jobs_count}</div>
                <div>{copy.failedRuns}: {status.failed_runs_count}</div>
                <div>{copy.lastTick}: {status.last_tick_at ?? copy.notRecordedYet}</div>
                <div>{copy.lastResult}: {status.last_success_at ?? copy.notRecordedYet}</div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold">{copy.createJobTitle}</div>
              <div className="text-muted-foreground text-sm">
                {copy.createJobDescription}
              </div>
            </div>
            <Button
              onClick={() => void handleCreate()}
              disabled={
                createJob.isPending ||
                !name.trim() ||
                !prompt.trim() ||
                !scheduleValue.trim()
              }
            >
              <PlusIcon className="size-4" />
              {copy.create}
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="automation-job-name">{copy.nameLabel}</label>
              <Input
                id="automation-job-name"
                name="automation-job-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={copy.namePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" id="automation-delivery-mode-label">{copy.deliveryModeLabel}</label>
              <Select value={deliveryMode} onValueChange={(value) => setDeliveryMode(value as AutomationDeliveryMode)}>
                <SelectTrigger aria-labelledby="automation-delivery-mode-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">{copy.deliveryModes.local}</SelectItem>
                  <SelectItem value="thread">{copy.deliveryModes.thread}</SelectItem>
                  <SelectItem value="channel">{copy.deliveryModes.channel}</SelectItem>
                  <SelectItem value="multi">{copy.deliveryModes.multi}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="automation-job-prompt">{copy.promptLabel}</label>
              <Textarea
                id="automation-job-prompt"
                name="automation-job-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={copy.promptPlaceholder}
                className="min-h-24"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" id="automation-schedule-kind-label">{copy.scheduleKindLabel}</label>
              <Select value={scheduleKind} onValueChange={(value) => setScheduleKind(value as AutomationScheduleKind)}>
                <SelectTrigger aria-labelledby="automation-schedule-kind-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">{copy.scheduleKinds.once}</SelectItem>
                  <SelectItem value="interval">{copy.scheduleKinds.interval}</SelectItem>
                  <SelectItem value="cron">{copy.scheduleKinds.cron}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="automation-schedule-value">{copy.scheduleValueLabel}</label>
              <Input
                id="automation-schedule-value"
                name="automation-schedule-value"
                value={scheduleValue}
                onChange={(event) => setScheduleValue(event.target.value)}
              />
              <div className="text-muted-foreground text-xs">{scheduleHelp}</div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="automation-attached-skills">{copy.attachedSkillsLabel}</label>
              <Input
                id="automation-attached-skills"
                name="automation-attached-skills"
                value={skillsText}
                onChange={(event) => setSkillsText(event.target.value)}
                placeholder={copy.attachedSkillsPlaceholder}
              />
            </div>
          </div>
        </div>

        {firstError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">
            {firstError instanceof Error ? firstError.message : String(firstError)}
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <div className="text-base font-semibold">{copy.jobsTitle}</div>
            <div className="text-muted-foreground text-sm">
              {copy.jobsDescription}
            </div>
          </div>
          {jobsLoading ? (
            <div className="text-muted-foreground text-sm">{t.common.loading}</div>
          ) : jobs.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              {copy.emptyJobs}
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Item key={job.id} className="items-start gap-4 rounded-xl border p-4" variant="outline">
                  <ItemContent>
                    <ItemTitle className="flex items-center gap-2">
                      <span>{job.name}</span>
                      <Badge variant="secondary">{stateLabels[job.state] ?? job.state}</Badge>
                      <Badge variant="outline">{copy.scheduleKinds[job.schedule_kind] ?? job.schedule_kind}</Badge>
                    </ItemTitle>
                    <div className="text-muted-foreground mt-2 space-y-2 text-sm">
                      <div>{job.prompt}</div>
                      <div className="grid gap-2 text-xs md:grid-cols-3">
                        <span>{copy.schedulePrefix}: {job.schedule_value}</span>
                        <span>{copy.deliveryPrefix}: {copy.deliveryModes[job.delivery_mode] ?? job.delivery_mode}</span>
                        <span>{copy.nextRunPrefix}: {job.next_run_at ?? copy.notScheduled}</span>
                      </div>
                      {job.last_result_summary ? (
                        <div className="rounded-md bg-muted/60 p-2 text-xs">
                          {copy.lastResult}: {job.last_result_summary}
                        </div>
                      ) : null}
                    </div>
                  </ItemContent>
                  <ItemActions className="flex flex-row flex-wrap gap-2 md:flex-col md:items-end">
                    {job.state === "paused" ? (
                      <Button variant="outline" size="sm" onClick={() => resumeJob.mutate(job.id)}>
                        <PlayIcon className="size-4" />
                        {copy.resume}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => pauseJob.mutate(job.id)}>
                        <PauseIcon className="size-4" />
                        {copy.pause}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => runJob.mutate(job.id)}>
                      <ZapIcon className="size-4" />
                      {copy.runNow}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeJob.mutate(job.id)}>
                      <Trash2Icon className="size-4" />
                      {copy.remove}
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <div className="text-base font-semibold">{copy.recentRunsTitle}</div>
            <div className="text-muted-foreground text-sm">
              {copy.recentRunsDescription}
            </div>
          </div>
          {runsLoading ? (
            <div className="text-muted-foreground text-sm">{t.common.loading}</div>
          ) : runs.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              {copy.emptyRuns}
            </div>
          ) : (
            <div className="space-y-3">
              {runs.slice(0, 8).map((run) => (
                <div key={run.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{run.id}</div>
                      <Badge variant="secondary">{stateLabels[run.status] ?? run.status}</Badge>
                    </div>
                    <div className="text-muted-foreground text-xs">{run.job_id}</div>
                  </div>
                  <div className="text-muted-foreground mt-2 text-sm">
                    {run.result_summary || copy.noSummary}
                  </div>
                  {run.output_artifacts.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {run.output_artifacts.map((artifact) => (
                        <Badge key={artifact} variant="outline">
                          {artifact}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="text-muted-foreground size-4" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
