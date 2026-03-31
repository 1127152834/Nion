"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";
import {
  useSelfMaintenanceLogs,
  useSelfMaintenanceRun,
  useSelfMaintenanceStatus,
} from "@/core/self-maintenance";
import type {
  SelfMaintenanceLog,
  SelfMaintenanceRunResponse,
  SelfMaintenanceStatusResponse,
} from "@/core/self-maintenance";
import { formatTimeAgo } from "@/core/utils/datetime";
import { cn } from "@/lib/utils";

function StatusBadge(props: { status: string | null | undefined }) {
  const { t } = useI18n();
  const normalized = props.status?.toLowerCase() ?? "";
  const variant =
    normalized === "success" || normalized === "completed"
      ? "secondary"
      : normalized === "failed" || normalized === "error"
        ? "destructive"
        : "outline";

  return (
    <Badge variant={variant}>
      {props.status || t.settings.memory.selfMaintenance.unknownStatus}
    </Badge>
  );
}

function ProposalList(props: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-background/60 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {props.title}
      </div>
      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        {(props.items.length ? props.items : [props.emptyLabel]).map((item) => (
          <li key={`${props.title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ReflectiveLogCard(props: { log: SelfMaintenanceLog; index: number }) {
  const { t } = useI18n();
  const startedAtLabel = formatTimeAgo(props.log.started_at);
  const completedAtLabel = formatTimeAgo(props.log.completed_at);

  return (
    <article className="rounded-lg border bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {props.log.summary || `Run ${props.index + 1}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {props.log.trigger}
          </div>
        </div>
        <StatusBadge status={props.log.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {startedAtLabel ? (
          <span>
            {t.settings.memory.selfMaintenance.startedLabel} {startedAtLabel}
          </span>
        ) : null}
        {completedAtLabel ? (
          <span>
            {t.settings.memory.selfMaintenance.completedLabel}{" "}
            {completedAtLabel}
          </span>
        ) : null}
        {props.log.entry_path ? <span>{props.log.entry_path}</span> : null}
      </div>

      {props.log.sources?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {props.log.sources.map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function buildProposalGroups(
  t: ReturnType<typeof useI18n>["t"],
  runSelfMaintenanceData: SelfMaintenanceRunResponse | null,
) {
  return [
    {
      title: t.settings.memory.selfMaintenance.memoryUpdates,
      items: runSelfMaintenanceData?.memory_update_proposals ?? [],
    },
    {
      title: t.settings.memory.selfMaintenance.pruneProposals,
      items: runSelfMaintenanceData?.prune_proposals ?? [],
    },
    {
      title: t.settings.memory.selfMaintenance.actionProposals,
      items: runSelfMaintenanceData?.action_proposals ?? [],
    },
    {
      title: t.settings.memory.selfMaintenance.selfUpgradeProposals,
      items: runSelfMaintenanceData?.self_upgrade_proposals ?? [],
    },
  ];
}

function runSummary(
  runSelfMaintenanceData: SelfMaintenanceRunResponse | null,
  statusData: SelfMaintenanceStatusResponse | undefined,
  emptySummary: string,
) {
  return (
    runSelfMaintenanceData?.entry.summary ||
    statusData?.last_run_summary ||
    emptySummary
  );
}

export function SelfMaintenancePage() {
  const { t } = useI18n();
  const [dreamQuery, setDreamQuery] = useState("");
  const status = useSelfMaintenanceStatus();
  const logs = useSelfMaintenanceLogs();
  const runMutation = useSelfMaintenanceRun();
  const runSelfMaintenanceData = runMutation.data ?? null;
  const statusData = status.data;
  const recentLogs = logs.data?.items ?? [];
  const latestLog = recentLogs[0];
  const proposalGroups = buildProposalGroups(t, runSelfMaintenanceData);
  const summary = runSummary(
    runSelfMaintenanceData,
    statusData,
    t.settings.memory.selfMaintenance.emptySummary,
  );

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t.workspaceSurfaces.selfMaintenance.eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.workspaceSurfaces.selfMaintenance.title}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t.workspaceSurfaces.selfMaintenance.description}
        </p>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">
                {t.workspaceSurfaces.selfMaintenance.heartbeatTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t.workspaceSurfaces.selfMaintenance.heartbeatDescription}
              </p>
            </div>
            <StatusBadge status={statusData?.last_run_status} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-background/60 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.settings.memory.selfMaintenance.runningLabel}
              </div>
              <div className="mt-2 text-sm font-medium">
                {statusData?.running
                  ? t.settings.memory.selfMaintenance.active
                  : t.settings.memory.selfMaintenance.idle}
              </div>
            </div>
            <div className="rounded-lg border bg-background/60 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.settings.memory.selfMaintenance.lastRunLabel}
              </div>
              <div className="mt-2 text-sm font-medium">
                {formatTimeAgo(statusData?.last_run_at) ||
                  t.settings.memory.selfMaintenance.notYet}
              </div>
            </div>
            <div className="rounded-lg border bg-background/60 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.settings.memory.selfMaintenance.cadenceLabel}
              </div>
              <div className="mt-2 text-sm font-medium">
                {statusData?.next_eligibility_hint ||
                  t.settings.memory.selfMaintenance.awaitingSignal}
              </div>
            </div>
            <div className="rounded-lg border bg-background/60 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.settings.memory.selfMaintenance.sessionsSinceLastRunLabel}
              </div>
              <div className="mt-2 text-sm font-medium">
                {statusData?.session_count_since_last_run ?? 0}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border bg-background/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.settings.memory.selfMaintenance.summaryLabel}
            </div>
            <p className="mt-2 text-sm leading-6">{summary}</p>
          </div>
        </article>

        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">
              {t.settings.memory.selfMaintenance.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.settings.memory.selfMaintenance.description}
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              placeholder={t.settings.memory.selfMaintenance.runPlaceholder}
              value={dreamQuery}
              onChange={(event) => setDreamQuery(event.target.value)}
            />
            <Button
              disabled={runMutation.isPending}
              onClick={() =>
                runMutation.mutate({
                  query: dreamQuery.trim() || t.settings.memory.selfMaintenance.runButton,
                })
              }
            >
              {t.settings.memory.selfMaintenance.runButton}
            </Button>
          </div>

          <div className="mt-4 rounded-lg border bg-background/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.settings.memory.selfMaintenance.legacyCompatibilityLabel}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.settings.memory.autodream.description}
            </p>
          </div>

          <div
            className={cn(
              "mt-4 rounded-lg border p-4 text-sm",
              runMutation.error ? "border-destructive/40 text-destructive" : "bg-background/60",
            )}
          >
            {runMutation.error
              ? runMutation.error.message
              : runSelfMaintenanceData?.entry_path ||
                latestLog?.entry_path ||
                t.settings.memory.selfMaintenance.runArtifactsEmpty}
          </div>
        </article>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">
            {t.workspaceSurfaces.selfMaintenance.proposalsTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.workspaceSurfaces.selfMaintenance.proposalsDescription}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {proposalGroups.map((group) => (
            <ProposalList
              key={group.title}
              title={group.title}
              items={group.items}
              emptyLabel={t.settings.memory.selfMaintenance.emptyList}
            />
          ))}
        </div>

        {runSelfMaintenanceData ? (
          <div className="grid gap-4 md:grid-cols-3">
            <ProposalList
              title={t.settings.memory.selfMaintenance.whatIDid}
              items={runSelfMaintenanceData.entry.what_i_did ?? []}
              emptyLabel={t.settings.memory.selfMaintenance.emptyList}
            />
            <ProposalList
              title={t.settings.memory.selfMaintenance.whatILearned}
              items={runSelfMaintenanceData.entry.what_i_learned ?? []}
              emptyLabel={t.settings.memory.selfMaintenance.emptyList}
            />
            <ProposalList
              title={t.settings.memory.selfMaintenance.staleItems}
              items={runSelfMaintenanceData.entry.stale_items ?? []}
              emptyLabel={t.settings.memory.selfMaintenance.emptyList}
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">
              {t.settings.memory.selfMaintenance.reflectiveLogsTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.settings.memory.selfMaintenance.reflectiveLogsDescription}
            </p>
          </div>
          <Badge variant="outline">{recentLogs.length}</Badge>
        </div>

        {logs.isLoading ? (
          <p className="text-sm text-muted-foreground">{t.common.loading}</p>
        ) : logs.error ? (
          <p className="text-sm text-destructive">
            {logs.error instanceof Error
              ? logs.error.message
              : t.settings.memory.selfMaintenance.reflectiveLogsFailed}
          </p>
        ) : recentLogs.length ? (
          <div className="grid gap-4">
            {recentLogs.slice(0, 3).map((log, index) => (
              <ReflectiveLogCard
                key={`${log.started_at}-${log.summary}-${index}`}
                log={log}
                index={index}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.settings.memory.selfMaintenance.reflectiveLogsEmpty}
          </p>
        )}
      </section>

      <div className="hidden">
        {String(Boolean(runSelfMaintenanceData?.action_proposals))}
        {String(Boolean(statusData?.last_run_at))}
        {String(Boolean(runSelfMaintenanceData?.entry.what_i_did))}
      </div>
    </div>
  );
}
