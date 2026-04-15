"use client";

import Link from "next/link";

import {
  useKnowledgeActivity,
  useKnowledgeJobs,
  useKnowledgeLint,
  useKnowledgePages,
  useKnowledgeQueue,
  useRebuildKnowledgeGraph,
} from "@/core/knowledge";

const ACTIVITY_LABELS: Record<string, string> = {
  job_started: "job_started",
  page_created: "page_created",
  source_missing_detected: "source_missing_detected",
  job_succeeded: "job_succeeded",
  job_failed: "job_failed",
  graph_rebuilt: "graph_rebuilt",
};

export function KnowledgeHomePage() {
  const { queue, isLoading: queueLoading } = useKnowledgeQueue();
  const { pages, isLoading: pagesLoading } = useKnowledgePages(queue);
  const { jobs, isLoading: jobsLoading } = useKnowledgeJobs();
  const { events, isLoading: activityLoading } = useKnowledgeActivity();
  const { report } = useKnowledgeLint();
  const rebuild = useRebuildKnowledgeGraph();
  const compiledCount = queue.filter((item) => item.status === "compiled").length;
  const staleCount = queue.filter((item) => item.status === "stale").length;

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <section className="rounded-lg border bg-background p-5">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Knowledge Base</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Overview for the compiled knowledge surface. Notebook 是原料层，这里才是编译后的知识页、知识查询和图谱状态。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Queue</div>
          <div className="mt-3 text-3xl font-semibold">{queue.length}</div>
          <div className="mt-2 text-sm text-muted-foreground">source candidates</div>
        </div>
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Compiled</div>
          <div className="mt-3 text-3xl font-semibold">{compiledCount}</div>
          <div className="mt-2 text-sm text-muted-foreground">compiled pages</div>
        </div>
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Stale</div>
          <div className="mt-3 text-3xl font-semibold">{staleCount}</div>
          <div className="mt-2 text-sm text-muted-foreground">need recompilation</div>
        </div>
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Lint</div>
          <div className="mt-3 text-3xl font-semibold">{report?.broken_links.length ?? 0}</div>
          <div className="mt-2 text-sm text-muted-foreground">broken links</div>
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold tracking-tight">Queue</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Queue summary for notebook-derived source candidates. 它告诉你哪些内容还没编译、哪些已经变成 wiki pages。
            </p>
          </div>
          <Link href="/workspace/knowledge/queue" className="rounded-md border px-3 py-2 text-sm">
            open queue
          </Link>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {queueLoading ? <div>loading queue…</div> : null}
          {!queueLoading && queue.slice(0, 6).map((item) => (
            <div key={item.source_id} className="rounded-md border px-3 py-2">
              {item.title} · {item.status} · {item.last_compiled_at ?? "not compiled yet"}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold tracking-tight">Compiled pages</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Recently compiled pages from notebook sources.
            </p>
          </div>
          <Link href="/workspace/knowledge/query" className="rounded-md border px-3 py-2 text-sm">
            query pages
          </Link>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {pagesLoading ? <div>loading compiled pages…</div> : null}
          {!pagesLoading && pages.length === 0 ? <div>no compiled pages yet</div> : null}
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
            <h2 className="text-[1.1rem] font-semibold tracking-tight">Recent compile jobs</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Visible job history for notebook-to-knowledge compilation.
            </p>
          </div>
          <Link href="/workspace/knowledge/queue" className="rounded-md border px-3 py-2 text-sm">
            inspect queue
          </Link>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {jobsLoading ? <div>loading jobs…</div> : null}
          {!jobsLoading && jobs.length === 0 ? <div>no compile jobs yet</div> : null}
          {!jobsLoading && jobs.slice(0, 6).map((job) => (
            <div key={job.job_id} className="rounded-md border px-3 py-2">
              {job.job_id} · stage={job.stage} · status={job.status} · created_page_ids=
              {job.created_page_ids.length}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold tracking-tight">Activity feed</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Visible activity feed for running, failed, and completed knowledge compilation.
            </p>
          </div>
          <Link href="/workspace/knowledge/queue" className="rounded-md border px-3 py-2 text-sm">
            inspect activity
          </Link>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {activityLoading ? <div>loading activity…</div> : null}
          {!activityLoading && events.length === 0 ? <div>no activity yet</div> : null}
          {!activityLoading && events.slice(0, 6).map((event) => (
            <div key={event.event_id} className="rounded-md border px-3 py-2">
              {ACTIVITY_LABELS[event.event_type] ?? event.event_type} · {event.job_id ?? event.source_id ?? "knowledge"} · {event.created_at}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-semibold tracking-tight">Graph</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Graph status and latest rebuild information.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/workspace/knowledge/graph" className="rounded-md border px-3 py-2 text-sm">
              open graph
            </Link>
            <button
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => rebuild.mutate()}
            >
              rebuild graph
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{report?.broken_links.length ?? 0} broken links</span>
          <span>{report?.orphan_pages.length ?? 0} orphan pages</span>
          <span>{rebuild.isPending ? "rebuilding…" : "graph ready"}</span>
        </div>
      </section>
    </main>
  );
}
