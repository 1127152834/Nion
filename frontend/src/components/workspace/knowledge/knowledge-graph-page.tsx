"use client";

import { useRebuildKnowledgeGraph } from "@/core/knowledge";

export function KnowledgeGraphPage() {
  const rebuild = useRebuildKnowledgeGraph();

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <section className="rounded-lg border bg-background p-5">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Knowledge Graph</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inspect graph state and rebuild the current graph artifacts.
        </p>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-[1.1rem] font-semibold tracking-tight">graph state</h2>
            <p className="text-sm text-muted-foreground">
              EXTRACTED / INFERRED / AMBIGUOUS edge types appear here.
            </p>
          </div>
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => rebuild.mutate()}
          >
            Rebuild graph
          </button>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          {rebuild.isPending ? "rebuilding…" : null}
          {rebuild.data ? `nodes: ${rebuild.data.nodes.length}, edges: ${rebuild.data.edges.length}` : null}
        </div>
      </section>
    </main>
  );
}
