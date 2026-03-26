import type { NotebookDirectoryEntry, NotebookTreeResponse } from "./types";

export type NotebookTreeNode =
  | {
      kind: "directory";
      path: string;
      name: string;
      children: NotebookTreeNode[];
      depth: number;
    }
  | {
      kind: "file";
      path: string;
      name: string;
      note_id?: string | null;
      depth: number;
    };

function ensureDirectoryNode(
  map: Map<string, NotebookTreeNode>,
  entry: NotebookDirectoryEntry,
): NotebookTreeNode {
  const existing = map.get(entry.path);
  if (existing) {
    return existing;
  }
  const created: NotebookTreeNode = {
    kind: "directory",
    path: entry.path,
    name: entry.name,
    depth: entry.depth,
    children: [],
  };
  map.set(entry.path, created);
  return created;
}

function parentPath(path: string) {
  const index = path.lastIndexOf("/");
  return index >= 0 ? path.slice(0, index) : "";
}

export function buildNotebookTree(tree: NotebookTreeResponse): NotebookTreeNode[] {
  const directoryMap = new Map<string, NotebookTreeNode>();
  const roots: NotebookTreeNode[] = [];

  const sortedDirectories = [...tree.directories].sort((left, right) =>
    left.path.localeCompare(right.path),
  );

  for (const directory of sortedDirectories) {
    const node = ensureDirectoryNode(directoryMap, directory);
    const parent = parentPath(directory.path);
    if (!parent) {
      roots.push(node);
      continue;
    }
    const parentNode = directoryMap.get(parent);
    if (parentNode?.kind === "directory") {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortedFiles = [...tree.files].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  for (const file of sortedFiles) {
    const node: NotebookTreeNode = {
      kind: "file",
      path: file.path,
      name: file.name,
      note_id: file.note_id,
      depth: file.depth,
    };
    const parent = parentPath(file.path);
    if (!parent) {
      roots.push(node);
      continue;
    }
    const parentNode = directoryMap.get(parent);
    if (parentNode?.kind === "directory") {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
