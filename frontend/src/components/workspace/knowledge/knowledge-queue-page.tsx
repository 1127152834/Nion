"use client";

import {
  useApproveKnowledgeQueue,
  useKnowledgeActivity,
  useKnowledgeJobs,
  useKnowledgeQueue,
} from "@/core/knowledge";

const ACTIVITY_LABELS: Record<string, string> = {
  job_started: "job_started",
  page_created: "page_created",
  source_missing_detected: "source_missing_detected",
  job_failed: "job_failed",
  job_succeeded: "job_succeeded",
};

export function KnowledgeQueuePage() {
  const { queue, isLoading, error, isPolling } = useKnowledgeQueue();
  const { jobs, activeJob } = useKnowledgeJobs();
  const { events } = useKnowledgeActivity();
  const approve = useApproveKnowledgeQueue();
  const hasVisibleProgress = approve.isPending || activeJob !== null;

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <section className="rounded-lg border bg-background p-5">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Knowledge Queue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review queue activity, stale candidates, and running knowledge work before they settle into compiled pages.
        </p>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-[1.1rem] font-semibold tracking-tight">queued candidates</h2>
            <p className="text-sm text-muted-foreground">
              queued / stale / compiled candidates are reviewed here, and Activity stays visible while work is still running.
            </p>
          </div>
          <button
            className="rounded-md border px-3 py-2 text-sm"
            disabled={approve.isPending || queue.length === 0}
            onClick={() => approve.mutate(queue.map((item) => item.source_id))}
          >
            {approve.isPending ? "approving…" : "approve"}
          </button>
        </div>
        <div className="mt-3 rounded-md border px-3 py-2 text-xs text-muted-foreground">
          {hasVisibleProgress ? (
            <span>
              visible queue activity · stage={activeJob?.stage ?? "queued"} · status=
              {activeJob?.status ?? "pending"} · {isPolling ? "polling" : "refreshing"}
            </span>
          ) : (
            <span>idle queue</span>
          )}
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {isLoading ? <div>loading queue…</div> : null}
          {!isLoading && isPolling ? <div>polling queue progress…</div> : null}
          {error ? <div>queue error</div> : null}
          {!isLoading && !error
            ? queue.map((item) => (
                <div key={item.source_id} className="rounded-md border px-3 py-2">
                  <div className="font-medium text-foreground">{item.title}</div>
                  <div className="mt-1 text-xs">
                    status={item.status} · last_compiled_at={item.last_compiled_at ?? "n/a"}
                  </div>
                  {item.compile_error ? (
                    <div className="mt-1 text-xs text-destructive">
                      compile_error={item.compile_error}
                    </div>
                  ) : null}
                </div>
              ))
            : null}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="space-y-1">
          <h2 className="text-[1.1rem] font-semibold tracking-tight">queue activity jobs</h2>
          <p className="text-sm text-muted-foreground">
            Visible running and completed queue activity for notebook-derived knowledge work.
          </p>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {jobs.length === 0 ? <div>no jobs yet</div> : null}
          {activeJob ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-amber-900">
              activeJob={activeJob.job_id} · stage={activeJob.stage} · status={activeJob.status}
            </div>
          ) : null}
          {jobs.map((job) => (
            <div key={job.job_id} className="rounded-md border px-3 py-2">
              {job.job_id} · stage={job.stage} · status={job.status} · created_page_ids=
              {job.created_page_ids.length}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="space-y-1">
          <h2 className="text-[1.1rem] font-semibold tracking-tight">Activity feed</h2>
          <p className="text-sm text-muted-foreground">
            Visible activity feed for queue approvals, running stages, and source_missing_detected transitions.
          </p>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {events.length === 0 ? <div>no activity yet</div> : null}
          {events.slice(0, 8).map((event) => (
            <div key={event.event_id} className="rounded-md border px-3 py-2">
              {ACTIVITY_LABELS[event.event_type] ?? event.event_type} · {event.job_id ?? event.source_id ?? "knowledge"} · {event.created_at}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
