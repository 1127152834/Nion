"use client";

import { ChevronRightIcon, FileTextIcon, FolderIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { NotebookTreeNode } from "@/core/notebook";

type NotebookTreeViewProps = {
  activePath: string | null;
  nodes: NotebookTreeNode[];
  onSelectNote: (noteId: string | null) => void;
};

export function NotebookTreeView({
  activePath,
  nodes,
  onSelectNote,
}: NotebookTreeViewProps) {
  return (
    <>
      {nodes.map((node) => (
        <NotebookTreeItem
          key={node.path}
          activePath={activePath}
          node={node}
          onSelect={onSelectNote}
        />
      ))}
    </>
  );
}

function NotebookTreeItem({
  activePath,
  node,
  onSelect,
}: {
  activePath: string | null;
  node: NotebookTreeNode;
  onSelect: (noteId: string | null) => void;
}) {
  if (node.kind === "file") {
    const active = node.path === activePath;

    return (
      <button
        type="button"
        onClick={() => onSelect(node.note_id ?? null)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${active ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
      >
        <FileTextIcon className="text-muted-foreground size-4 shrink-0" />
        <div className="min-w-0">
          <div className="truncate font-medium">{node.name}</div>
          <div className="text-muted-foreground truncate text-xs">{node.path}</div>
        </div>
      </button>
    );
  }

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm">
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <FolderIcon className="text-muted-foreground size-4" />
        <span className="truncate font-medium">{node.name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-2 pl-4">
        {node.children.map((child) => (
          <NotebookTreeItem
            key={child.path}
            activePath={activePath}
            node={child}
            onSelect={onSelect}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
