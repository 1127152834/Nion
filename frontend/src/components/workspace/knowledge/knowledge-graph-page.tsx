"use client";

import { useEffect, useMemo, useState } from "react";

import { useRebuildKnowledgeGraph } from "@/core/knowledge";

export function KnowledgeGraphPage() {
  const rebuild = useRebuildKnowledgeGraph();
  const nodes = rebuild.data?.nodes ?? [];
  const edges = rebuild.data?.edges ?? [];
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [storedPositions, setStoredPositions] = useState<Record<string, { left: string; top: string }>>({});
  const graphClusters = useMemo(() => {
    const clusters = new Map<string, string[]>();
    for (const node of nodes) {
      const id = String(node.id ?? "");
      const prefix = id.includes(":") ? id.split(":")[0]! : "misc";
      clusters.set(prefix, [...(clusters.get(prefix) ?? []), id]);
    }
    return Array.from(clusters.entries());
  }, [nodes]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("knowledge-graph-layout");
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, { left: string; top: string }>;
      setStoredPositions(parsed);
    } catch {
      // ignore corrupted local layout cache
    }
  }, []);

  const positionedNodes = useMemo(
    () =>
      nodes.map((node, index) => ({
        id: String(node.id ?? index),
        label: String(node.label ?? node.id ?? ""),
        left: storedPositions[String(node.id ?? index)]?.left ?? `${12 + (index % 3) * 30}%`,
        top: storedPositions[String(node.id ?? index)]?.top ?? `${16 + Math.floor(index / 3) * 24}%`,
      })),
    [nodes, storedPositions],
  );
  const activeNeighbors = useMemo(() => {
    if (!activeNodeId) {
      return new Set<string>();
    }
    const refs = new Set<string>([activeNodeId]);
    for (const edge of edges) {
      const from = String(edge.from ?? "");
      const to = String(edge.to ?? "");
      if (from === activeNodeId) {
        refs.add(to);
      }
      if (to === activeNodeId) {
        refs.add(from);
      }
    }
    return refs;
  }, [activeNodeId, edges]);

  function persistNodePosition(nodeId: string, left: string, top: string) {
    setStoredPositions((current) => {
      const next = { ...current, [nodeId]: { left, top } };
      localStorage.setItem("knowledge-graph-layout", JSON.stringify(next));
      return next;
    });
  }

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
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {graphClusters.map(([cluster, ids]) => (
            <div key={cluster} className="rounded-full border px-2.5 py-1">
              cluster={cluster} · {ids.length}
            </div>
          ))}
        </div>
        <div className="knowledge-graph-canvas relative mt-4 min-h-[24rem] overflow-hidden rounded-xl border bg-muted/20">
          <svg className="pointer-events-none absolute inset-0 size-full">
            {edges.map((edge, index) => {
              const from = positionedNodes.find((node) => node.id === String(edge.from ?? ""));
              const to = positionedNodes.find((node) => node.id === String(edge.to ?? ""));
              if (!from || !to) {
                return null;
              }
              const fromX = Number.parseFloat(from.left) + 8;
              const fromY = Number.parseFloat(from.top) + 4;
              const toX = Number.parseFloat(to.left) + 8;
              const toY = Number.parseFloat(to.top) + 4;
              const highlighted =
                activeNodeId &&
                (String(edge.from ?? "") === activeNodeId ||
                  String(edge.to ?? "") === activeNodeId);
              return (
                <line
                  key={`${String(edge.from ?? "")}:${String(edge.to ?? "")}:${index}`}
                  x1={`${fromX}%`}
                  y1={`${fromY}%`}
                  x2={`${toX}%`}
                  y2={`${toY}%`}
                  stroke={highlighted ? "currentColor" : "rgba(100,116,139,0.35)"}
                  strokeWidth={highlighted ? 2.5 : 1.2}
                />
              );
            })}
          </svg>
          {positionedNodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              no nodes
            </div>
          ) : null}
          {positionedNodes.map((node) => (
            <div
              key={node.id}
              draggable
              onDragStart={() => setDraggingNodeId(node.id)}
              onDragEnd={(event) => {
                setDraggingNodeId(null);
                const rect = event.currentTarget.parentElement?.getBoundingClientRect();
                if (!rect) {
                  return;
                }
                const left = `${((event.clientX - rect.left) / rect.width) * 100}%`;
                const top = `${((event.clientY - rect.top) / rect.height) * 100}%`;
                persistNodePosition(node.id, left, top);
              }}
              onMouseEnter={() => setActiveNodeId(node.id)}
              onMouseLeave={() => setActiveNodeId((current) => (current === node.id ? null : current))}
              className={`absolute cursor-grab rounded-full border bg-background px-4 py-2 text-sm shadow-sm transition-all ${
                activeNodeId === node.id
                  ? "z-10 scale-105 border-foreground"
                  : activeNeighbors.size === 0 || activeNeighbors.has(node.id)
                    ? "opacity-100"
                    : "opacity-35"
              } ${draggingNodeId === node.id ? "cursor-grabbing shadow-lg" : ""}`}
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
