import type { NotebookFileEntry, NotebookTreeNode } from "@/core/notebook";

export function buildRecentNotebookFiles(
  files: NotebookFileEntry[],
  limit = 6,
) {
  return [...files]
    .sort((left, right) => (right.mtime ?? 0) - (left.mtime ?? 0))
    .slice(0, limit);
}

export function collectRootNotebookFiles(nodes: NotebookTreeNode[]) {
  return nodes.filter(
    (node): node is Extract<NotebookTreeNode, { kind: "file" }> =>
      node.kind === "file",
  );
}

export function filterNotebookTreeNodes(
  nodes: NotebookTreeNode[],
  query: string,
): NotebookTreeNode[] {
  const loweredQuery = query.trim().toLowerCase();
  if (!loweredQuery) {
    return nodes;
  }

  const filtered: NotebookTreeNode[] = [];

  for (const node of nodes) {
    if (node.kind === "file") {
      if (matchesNotebookTreeNode(node, loweredQuery)) {
        filtered.push(node);
      }
      continue;
    }

    const children = filterNotebookTreeNodes(node.children, loweredQuery);
    if (matchesNotebookTreeNode(node, loweredQuery) || children.length > 0) {
      filtered.push({ ...node, children });
    }
  }

  return filtered;
}

function matchesNotebookTreeNode(node: NotebookTreeNode, query: string) {
  return (
    node.name.toLowerCase().includes(query) ||
    node.path.toLowerCase().includes(query)
  );
}
