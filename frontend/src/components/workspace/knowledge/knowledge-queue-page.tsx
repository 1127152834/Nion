"use client";

import { useKnowledgeQueue } from "@/core/knowledge";

export function KnowledgeQueuePage() {
  const { queue, isLoading, error } = useKnowledgeQueue();

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <section className="rounded-lg border bg-background p-5">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Knowledge Queue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review queued and stale source candidates before they enter the compiled knowledge flow.
        </p>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-[1.1rem] font-semibold tracking-tight">queued candidates</h2>
            <p className="text-sm text-muted-foreground">
              queued / stale / compiled candidates are reviewed here.
            </p>
          </div>
          <button className="rounded-md border px-3 py-2 text-sm">approve</button>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {isLoading ? <div>loading queue…</div> : null}
          {error ? <div>queue error</div> : null}
          {!isLoading && !error
            ? queue.map((item) => (
                <div key={item.source_id} className="rounded-md border px-3 py-2">
                  {item.title} · {item.status}
                </div>
              ))
            : null}
        </div>
      </section>
    </main>
  );
}
