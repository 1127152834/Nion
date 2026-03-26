"use client";

import { FolderPlusIcon, SearchIcon, SparklesIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NotebookFileEntry, NotebookTreeNode } from "@/core/notebook";

import {
  buildRecentNotebookFiles,
  filterNotebookTreeNodes,
} from "./notebook-sidebar-state";
import { NotebookTreeView } from "./notebook-tree-view";

type NotebookSidebarCopy = {
  createNote: string;
  emptyDescription: string;
  emptyTitle: string;
  quickCaptureLabel: string;
  recentTitle: string;
  searchPlaceholder: string;
  noteListDescription: string;
  noteListTitle: string;
  trashTitle: string;
};

type NotebookSidebarProps = {
  activePath: string | null;
  copy: NotebookSidebarCopy;
  isLoading: boolean;
  loadingLabel: string;
  query: string;
  recentFiles: NotebookFileEntry[];
  treeNodes: NotebookTreeNode[];
  treeFileCount: number;
  onOpenCreate: () => void;
  onOpenQuickCapture: () => void;
  onQueryChange: (value: string) => void;
  onOpenTrash: () => void;
  onSelectNote: (noteId: string | null) => void;
};

export function NotebookSidebar({
  activePath,
  copy,
  isLoading,
  loadingLabel,
  query,
  recentFiles,
  treeNodes,
  treeFileCount,
  onOpenCreate,
  onOpenQuickCapture,
  onQueryChange,
  onOpenTrash,
  onSelectNote,
}: NotebookSidebarProps) {
  const visibleTreeNodes = filterNotebookTreeNodes(treeNodes, query);
  const visibleRecentFiles = buildRecentNotebookFiles(recentFiles, 6);

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
            <Button size="sm" variant="secondary" onClick={onOpenQuickCapture}>
              <SparklesIcon className="size-4" />
              {copy.quickCaptureLabel}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(70vh-96px)]">
          <div className="space-y-4 p-3">
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="pl-9"
              />
            </div>

            {visibleRecentFiles.length > 0 ? (
              <section className="space-y-2">
                <div className="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wide">
                  {copy.recentTitle}
                </div>
                <div className="space-y-2">
                  {visibleRecentFiles.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => onSelectNote(file.note_id ?? null)}
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${file.path === activePath ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{file.name}</div>
                        <div className="text-muted-foreground truncate text-xs">{file.path}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-2">
              <div className="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wide">
                {copy.noteListTitle}
              </div>
            {isLoading ? (
              <div className="text-muted-foreground text-sm">{loadingLabel}</div>
            ) : treeFileCount === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                <div className="font-medium">{copy.emptyTitle}</div>
                <div className="mt-1">{copy.emptyDescription}</div>
              </div>
            ) : (
              <div className="space-y-2">
                <NotebookTreeView
                  activePath={activePath}
                  nodes={visibleTreeNodes}
                  onSelectNote={onSelectNote}
                />
              </div>
            )}
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
