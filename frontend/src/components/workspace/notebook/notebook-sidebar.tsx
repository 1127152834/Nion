"use client";

import { ChevronRightIcon, FileTextIcon, FolderIcon, FolderPlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NotebookTreeNode } from "@/core/notebook";

import { filterNotebookTreeNodes } from "./notebook-sidebar-state";

type NotebookSidebarCopy = {
  createNote: string;
  emptyDescription: string;
  emptyTitle: string;
  noteListDescription: string;
  noteListTitle: string;
  trashTitle: string;
};

type NotebookSidebarProps = {
  activePath: string | null;
  copy: NotebookSidebarCopy;
  isLoading: boolean;
  loadingLabel: string;
  treeNodes: NotebookTreeNode[];
  treeFileCount: number;
  onOpenCreate: () => void;
  onOpenTrash: () => void;
  onSelectNote: (noteId: string | null) => void;
};

export function NotebookSidebar({
  activePath,
  copy,
  isLoading,
  loadingLabel,
  treeNodes,
  treeFileCount,
  onOpenCreate,
  onOpenTrash,
  onSelectNote,
}: NotebookSidebarProps) {
  const visibleTreeNodes = filterNotebookTreeNodes(treeNodes, "");

  return (
    <Card className="h-full rounded-none border-0 shadow-none">
      <CardHeader className="gap-3 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{copy.noteListTitle}</CardTitle>
            <CardDescription>{copy.noteListDescription}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onOpenTrash}>
              <Trash2Icon className="size-4" />
              {copy.trashTitle}
            </Button>
            <Button size="sm" onClick={onOpenCreate}>
              <FolderPlusIcon className="size-4" />
              {copy.createNote}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(70vh-96px)]">
          <div className="space-y-2 p-3">
            {isLoading ? (
              <div className="text-muted-foreground text-sm">{loadingLabel}</div>
            ) : treeFileCount === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                <div className="font-medium">{copy.emptyTitle}</div>
                <div className="mt-1">{copy.emptyDescription}</div>
              </div>
            ) : (
              visibleTreeNodes.map((node) => (
                <NotebookTreeItem
                  key={node.path}
                  activePath={activePath}
                  node={node}
                  onSelect={onSelectNote}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
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
