"use client";

import { useRebuildKnowledgeGraph } from "@/core/knowledge";

export function KnowledgeGraphPage() {
  const rebuild = useRebuildKnowledgeGraph();
  const nodes = rebuild.data?.nodes ?? [];
  const edges = rebuild.data?.edges ?? [];
  const positionedNodes = nodes.map((node, index) => ({
    id: String(node.id ?? index),
    label: String(node.label ?? node.id ?? ""),
    left: `${12 + (index % 3) * 30}%`,
    top: `${16 + Math.floor(index / 3) * 24}%`,
  }));

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
          {rebuild.data ? `nodes: ${nodes.length}, edges: ${edges.length}` : null}
        </div>
        <div className="knowledge-graph-canvas relative mt-4 min-h-[22rem] rounded-xl border bg-muted/20">
          {positionedNodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              no nodes
            </div>
          ) : null}
          {positionedNodes.map((node) => (
            <div
              key={node.id}
              className="absolute rounded-full border bg-background px-4 py-2 text-sm shadow-sm"
              style={{ left: node.left, top: node.top }}
            >
              {node.label}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border px-3 py-3 text-sm text-muted-foreground">
            <div className="mb-2 font-medium text-foreground">nodes</div>
            <div className="space-y-1">
              {nodes.length === 0 ? <div>no nodes</div> : null}
              {nodes.map((node, index) => (
                <div key={`${String(node.id ?? index)}`}>{String(node.label ?? node.id ?? "")}</div>
              ))}
            </div>
          </div>
          <div className="rounded-md border px-3 py-3 text-sm text-muted-foreground">
            <div className="mb-2 font-medium text-foreground">edges</div>
            <div className="space-y-1">
              {edges.length === 0 ? <div>no edges</div> : null}
              {edges.map((edge, index) => (
                <div key={`${String(edge.from ?? "")}:${String(edge.to ?? "")}:${index}`}>
                  {String(edge.from ?? "")} → {String(edge.to ?? "")} · {String(edge.edge_type ?? "")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
