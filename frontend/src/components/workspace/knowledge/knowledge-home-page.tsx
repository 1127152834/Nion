"use client";

import Link from "next/link";

import type { KnowledgeActivityEvent, KnowledgeCompileJob, KnowledgeSourceCandidate } from "@/core/knowledge";
import { useI18n } from "@/core/i18n/hooks";
import {
  useKnowledgeActivity,
  useKnowledgeJobs,
  useKnowledgeLint,
  useKnowledgePages,
  useKnowledgeQueue,
  useReconcileKnowledgeSources,
  useRebuildKnowledgeGraph,
} from "@/core/knowledge";

export function KnowledgeHomePage() {
  const { t } = useI18n();
  const copy = t.knowledgePage;
  const { queue, isLoading: queueLoading, isPolling: queuePolling } = useKnowledgeQueue();
  const { pages, isLoading: pagesLoading } = useKnowledgePages(queue);
  const {
    jobs,
    activeJob,
    isLoading: jobsLoading,
    isPolling: jobsPolling,
  } = useKnowledgeJobs();
  const { events, isLoading: activityLoading } = useKnowledgeActivity();
  const { report } = useKnowledgeLint();
  const rebuild = useRebuildKnowledgeGraph();
  const reconcile = useReconcileKnowledgeSources();
  const compiledCount = queue.filter((item) => item.status === "compiled").length;
  const staleCount = queue.filter((item) => item.status === "stale").length;
  const sourceMissingCount = queue.filter((item) => item.status === "source_missing").length;
  const archivedCount = pages.filter((page) => page.page_state === "archived").length;
  const isPolling = queuePolling || jobsPolling;
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
        <h1 className="text-[1.5rem] font-semibold tracking-tight">{copy.homeTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.homeDescription}</p>
      </section>

      <section className="rounded-lg border bg-muted/20 p-5">
        <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.semanticRetrievalTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.semanticRetrievalDescription}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{copy.queue}</div>
          <div className="mt-3 text-3xl font-semibold">{queue.length}</div>
          <div className="mt-2 text-sm text-muted-foreground">{copy.sourceCandidates}</div>
        </div>
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{copy.compiled}</div>
          <div className="mt-3 text-3xl font-semibold">{compiledCount}</div>
          <div className="mt-2 text-sm text-muted-foreground">{copy.compiledPages}</div>
        </div>
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{copy.stale}</div>
          <div className="mt-3 text-3xl font-semibold">{staleCount}</div>
          <div className="mt-2 text-sm text-muted-foreground">{copy.needRecompilation}</div>
        </div>
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{copy.activity}</div>
          <div className="mt-3 text-3xl font-semibold">{sourceMissingCount}</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {queue.filter((item) => item.status === "source_missing").length} {copy.sourceMissing}
          </div>
        </div>
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{copy.lint}</div>
          <div className="mt-3 text-3xl font-semibold">{report?.broken_links.length ?? 0}</div>
          <div className="mt-2 text-sm text-muted-foreground">{copy.brokenLinks}</div>
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.queueActivityStatus}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{copy.queueActivityDescription}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              disabled={reconcile.isPending}
              onClick={() => reconcile.mutate()}
            >
              {reconcile.isPending ? copy.reconciling : copy.reconcileNow}
            </button>
            <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
              {isPolling ? copy.refreshingStagedProgress : copy.idle}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-md border px-3 py-3 text-sm text-muted-foreground">
          {activeJob ? (
            <div>{formatJobSummary(activeJob)}</div>
          ) : (
            <div>{copy.noActiveCompileJob}</div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{sourceMissingCount} {copy.sourceMissingCandidates}</span>
          <span>{staleCount} {copy.staleCandidates}</span>
          <span>{archivedCount} {copy.archivedPages}</span>
          <span>{copy.reconcileHint}</span>
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.queueSummaryTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{copy.queueSummaryDescription}</p>
          </div>
          <Link href="/workspace/knowledge/queue" className="rounded-md border px-3 py-2 text-sm">
            {copy.openQueue}
          </Link>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {queueLoading ? <div>{copy.loadingQueue}</div> : null}
          {!queueLoading && queuePolling ? <div>{copy.pollingQueueProgress}</div> : null}
          {!queueLoading && queue.slice(0, 6).map((item) => (
            <div key={item.source_id} className="rounded-md border px-3 py-2">
              {item.title} · {formatCandidateSummary(item)}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.compiledPagesTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{copy.compiledPagesDescription}</p>
          </div>
          <Link href="/workspace/knowledge/query" className="rounded-md border px-3 py-2 text-sm">
            {copy.queryPages}
          </Link>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {pagesLoading ? <div>{copy.loadingCompiledPages}</div> : null}
          {!pagesLoading && pages.length === 0 ? <div>{copy.noCompiledPages}</div> : null}
          {!pagesLoading && pages.map((page) => (
            <Link
              key={page.page_id}
              href={`/workspace/knowledge/pages/${encodeURIComponent(page.page_id)}`}
              className="block rounded-md border px-3 py-2 hover:bg-muted/30"
            >
              {page.title} · {page.relative_path}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.recentCompileJobs}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{copy.recentCompileJobsDescription}</p>
          </div>
          <Link href="/workspace/knowledge/queue" className="rounded-md border px-3 py-2 text-sm">
            {copy.inspectQueue}
          </Link>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {jobsLoading ? <div>{copy.loadingJobs}</div> : null}
          {!jobsLoading && jobs.length === 0 ? <div>{copy.noCompileJobs}</div> : null}
          {!jobsLoading && jobs.slice(0, 6).map((job) => (
            <div key={job.job_id} className="rounded-md border px-3 py-2">
              {formatJobHistorySummary(job)}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.activityFeed}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{copy.activityFeedDescription}</p>
          </div>
          <Link href="/workspace/knowledge/queue" className="rounded-md border px-3 py-2 text-sm">
            {copy.inspectActivity}
          </Link>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {activityLoading ? <div>{copy.loadingActivity}</div> : null}
          {!activityLoading && events.length === 0 ? <div>{copy.noActivity}</div> : null}
          {!activityLoading && events.slice(0, 6).map((event) => (
            <div key={event.event_id} className="rounded-md border px-3 py-2">
              {formatActivitySummary(event)}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold tracking-tight">{copy.graph.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{copy.graph.description}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/workspace/knowledge/graph" className="rounded-md border px-3 py-2 text-sm">
              {copy.graph.title}
            </Link>
            <button
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => rebuild.mutate()}
            >
              {copy.graph.rebuild}
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{report?.broken_links.length ?? 0} {copy.brokenLinks}</span>
          <span>{report?.orphan_pages.length ?? 0} {copy.orphanPages}</span>
          <span>{rebuild.isPending ? copy.graph.rebuilding : copy.graph.stateTitle}</span>
        </div>
      </section>
    </main>
  );
}
