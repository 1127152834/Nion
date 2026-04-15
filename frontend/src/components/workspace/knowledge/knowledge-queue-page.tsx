"use client";

import type { KnowledgeActivityEvent, KnowledgeCompileJob, KnowledgeSourceCandidate } from "@/core/knowledge";
import { useI18n } from "@/core/i18n/hooks";
import {
  useApproveKnowledgeQueue,
  useKnowledgeActivity,
  useKnowledgeJobs,
  useKnowledgeQueue,
} from "@/core/knowledge";

export function KnowledgeQueuePage() {
  const { t } = useI18n();
  const copy = t.knowledgePage;
  const { queue, isLoading, error, isPolling } = useKnowledgeQueue();
  const { jobs, activeJob } = useKnowledgeJobs();
  const { events } = useKnowledgeActivity();
  const approve = useApproveKnowledgeQueue();
  const hasVisibleProgress = approve.isPending || activeJob !== null;
  const formatCandidateSummary = (candidate: KnowledgeSourceCandidate) =>
    copy.queueCandidateSummary(candidate.status, candidate.last_compiled_at ?? copy.notCompiledYet);
  const formatJobSummary = (job: KnowledgeCompileJob) =>
    copy.jobSummary(job.job_id, job.stage, job.status);
  const formatJobHistorySummary = (job: KnowledgeCompileJob) =>
    copy.jobHistorySummary(job.job_id, job.stage, job.status, job.created_page_ids.length);
  const formatActivitySummary = (event: KnowledgeActivityEvent) =>
    copy.activityEventSummary(
      copy.activityEventLabel(event.event_type),
      event.job_id ?? event.source_id ?? "knowledge",
      event.created_at,
    );

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <section className="rounded-lg border bg-background p-5">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">{copy.queueSummaryTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.queueSummaryDescription}</p>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.queue}</h2>
            <p className="text-sm text-muted-foreground">{copy.queueActivityDescription}</p>
          </div>
          <button
            className="rounded-md border px-3 py-2 text-sm"
            disabled={approve.isPending || queue.length === 0}
            onClick={() => approve.mutate(queue.map((item) => item.source_id))}
          >
            {approve.isPending ? copy.approving : copy.queue}
          </button>
        </div>
        <div className="mt-3 rounded-md border px-3 py-2 text-xs text-muted-foreground">
          {hasVisibleProgress ? (
            <span>
              {activeJob
                ? formatJobSummary(activeJob)
                : copy.jobSummary("queue", "queued", isPolling ? "running" : "pending")}
            </span>
          ) : (
            <span>{copy.idle}</span>
          )}
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {isLoading ? <div>{copy.loadingQueue}</div> : null}
          {!isLoading && isPolling ? <div>{copy.pollingQueueProgress}</div> : null}
          {error ? <div>{copy.queueError}</div> : null}
          {!isLoading && !error
            ? queue.map((item) => (
                <div key={item.source_id} className="rounded-md border px-3 py-2">
                  <div className="font-medium text-foreground">{item.title}</div>
                  <div className="mt-1 text-xs">{formatCandidateSummary(item)}</div>
                  {item.compile_error ? (
                    <div className="mt-1 text-xs text-destructive">
                      {item.compile_error}
                    </div>
                  ) : null}
                </div>
              ))
            : null}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="space-y-1">
          <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.recentCompileJobs}</h2>
          <p className="text-sm text-muted-foreground">{copy.recentCompileJobsDescription}</p>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {jobs.length === 0 ? <div>{copy.noCompileJobs}</div> : null}
          {activeJob ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-amber-900">
              {formatJobSummary(activeJob)}
            </div>
          ) : null}
          {jobs.map((job) => (
            <div key={job.job_id} className="rounded-md border px-3 py-2">
              {formatJobHistorySummary(job)}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="space-y-1">
          <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.activityFeed}</h2>
          <p className="text-sm text-muted-foreground">{copy.activityFeedDescription}</p>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {events.length === 0 ? <div>{copy.noActivity}</div> : null}
          {events.slice(0, 8).map((event) => (
            <div key={event.event_id} className="rounded-md border px-3 py-2">
              {formatActivitySummary(event)}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
