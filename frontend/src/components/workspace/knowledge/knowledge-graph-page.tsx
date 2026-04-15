"use client";

import {
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import "@xyflow/react/dist/style.css";

import {
  useKnowledgeGraph,
  useRebuildKnowledgeGraph,
  useSaveKnowledgeGraphLayout,
  type KnowledgeGraphLayout,
} from "@/core/knowledge";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 44;

function createEmptyLayoutDraft(): KnowledgeGraphLayout {
  return {
    version: 1,
    node_positions: {},
    collapsed_clusters: [],
    highlighted_node_ids: [],
    updated_at: new Date().toISOString(),
  };
}

function cloneLayoutDraft(layout: KnowledgeGraphLayout | null): KnowledgeGraphLayout {
  if (!layout) {
    return createEmptyLayoutDraft();
  }
  return {
    version: 1,
    node_positions: { ...layout.node_positions },
    collapsed_clusters: [...layout.collapsed_clusters],
    highlighted_node_ids: [...layout.highlighted_node_ids],
    updated_at: layout.updated_at,
  };
}

function buildNodePositionsFromFlowNodes(
  nodes: Array<Node<{ label: string }>>,
): KnowledgeGraphLayout["node_positions"] {
  return Object.fromEntries(
    nodes.map((node) => [
      node.id,
      {
        x: node.position.x,
        y: node.position.y,
      },
    ]),
  );
}

function mergeDraggedNodeIntoFlowNodes(
  nodes: Array<Node<{ label: string }>>,
  draggedNode: Node,
): Array<Node<{ label: string }>> {
  let found = false;
  const mergedNodes = nodes.map((node) => {
    if (node.id !== draggedNode.id) {
      return node;
    }
    found = true;
    return {
      ...node,
      position: {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
      },
    };
  });
  if (found) {
    return mergedNodes;
  }
  return [
    ...mergedNodes,
    {
      id: draggedNode.id,
      type: draggedNode.type ?? "default",
      position: {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
      },
      data: { label: String(draggedNode.data?.label ?? draggedNode.id) },
    },
  ];
}

function getLayoutUpdatedAtMs(layout: KnowledgeGraphLayout) {
  const timestamp = Date.parse(layout.updated_at);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isNewerOrEqualLayout(
  nextLayout: KnowledgeGraphLayout,
  currentLayout: KnowledgeGraphLayout,
) {
  return getLayoutUpdatedAtMs(nextLayout) >= getLayoutUpdatedAtMs(currentLayout);
}

function defaultNodePosition(index: number) {
  return {
    x: 120 + (index % 4) * 240,
    y: 100 + Math.floor(index / 4) * 160,
  };
}

function getNodeCluster(nodeId: string) {
  return nodeId.includes(":") ? nodeId.split(":")[0]! : "misc";
}

export function KnowledgeGraphPage() {
  const { graph, isLoading, error } = useKnowledgeGraph();
  const rebuild = useRebuildKnowledgeGraph();
  const saveKnowledgeGraphLayoutState = useSaveKnowledgeGraphLayout();
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const layout = graph?.layout ?? null;
  const [flowNodes, setFlowNodes] = useState<Array<Node<{ label: string }>>>([]);
  const [layoutDraft, setLayoutDraft] = useState<KnowledgeGraphLayout>(() =>
    cloneLayoutDraft(layout),
  );
  const graphClusters = useMemo(() => {
    const clusters = new Map<string, string[]>();
    for (const node of nodes) {
      const id = String(node.id ?? "");
      const prefix = getNodeCluster(id);
      clusters.set(prefix, [...(clusters.get(prefix) ?? []), id]);
    }
    return Array.from(clusters.entries());
  }, [nodes]);

  useEffect(() => {
    setLayoutDraft((currentLayoutDraft) => {
      const nextLayoutDraft = cloneLayoutDraft(layout);
      return isNewerOrEqualLayout(nextLayoutDraft, currentLayoutDraft)
        ? nextLayoutDraft
        : currentLayoutDraft;
    });
  }, [layout]);

  useEffect(() => {
    setFlowNodes(
      nodes.map((node, index) => ({
        id: String(node.id ?? index),
        type: "default",
        position:
          layoutDraft.node_positions[String(node.id ?? index)] ?? defaultNodePosition(index),
        data: { label: String(node.label ?? node.id ?? "") },
        style: {
          minWidth: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
          borderRadius: 999,
          borderColor: "hsl(var(--border))",
          background: "hsl(var(--background))",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        },
      })),
    );
  }, [layoutDraft.node_positions, nodes]);

  const flowEdges = useMemo<Array<Edge>>(
    () =>
      edges.map((edge, index) => ({
        id: `${String(edge.from ?? "")}:${String(edge.to ?? "")}:${index}`,
        source: String(edge.from ?? ""),
        target: String(edge.to ?? ""),
        label: String(edge.edge_type ?? ""),
        animated: String(edge.edge_type ?? "") === "INFERRED",
        style: { strokeWidth: 1.4 },
      })),
    [edges],
  );

  function handleNodesChange(changes: NodeChange[]) {
    setFlowNodes((current) => applyNodeChanges(changes, current));
  }

  function persistNodePosition(node: Node) {
    const mergedFlowNodes = mergeDraggedNodeIntoFlowNodes(flowNodes, node);
    const nextLayoutDraft: KnowledgeGraphLayout = {
      ...layoutDraft,
      node_positions: buildNodePositionsFromFlowNodes(mergedFlowNodes),
      updated_at: new Date().toISOString(),
    };
    setFlowNodes(mergedFlowNodes);
    setLayoutDraft(nextLayoutDraft);
    saveKnowledgeGraphLayoutState.mutate(nextLayoutDraft, {
      onSuccess: (savedLayout) => {
        setLayoutDraft((currentLayoutDraft) =>
          isNewerOrEqualLayout(savedLayout, currentLayoutDraft) ? savedLayout : currentLayoutDraft,
        );
      },
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
          {isLoading ? "loading graph…" : null}
          {rebuild.isPending ? "rebuilding…" : null}
          {error ? "failed to load graph" : null}
          {graph ? `nodes: ${nodes.length}, edges: ${edges.length}` : null}
          {saveKnowledgeGraphLayoutState.isPending ? " · saving layout…" : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {graphClusters.map(([cluster, ids]) => (
            <div key={cluster} className="rounded-full border px-2.5 py-1">
              cluster={cluster} · {ids.length}
            </div>
          ))}
        </div>
        <div className="knowledge-graph-canvas relative mt-4 min-h-[24rem] overflow-hidden rounded-xl border bg-muted/20">
          {flowNodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              no nodes
            </div>
          ) : null}
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={handleNodesChange}
            onNodeDragStop={(_event, node) => persistNodePosition(node)}
            fitView
            minZoom={0.2}
            maxZoom={1.6}
          >
            <Background />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
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
