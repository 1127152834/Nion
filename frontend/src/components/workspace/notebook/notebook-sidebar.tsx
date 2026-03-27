"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PinIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import type { NotebookNoteSummary, NotebookTreeNode } from "@/core/notebook";

import {
  buildRecentNotebookNotes,
  filterNotebookTreeNodes,
  hasNotebookTreeContent,
} from "./notebook-sidebar-state";
import { NotebookTreeView } from "./notebook-tree-view";
import type { DragPayload } from "./notebook-tree-view";

type NotebookSidebarCopy = {
  createNoteHere: string;
  createSubfolder: string;
  createFolder: string;
  createNote: string;
  deleteFolder: string;
  deleteNote: string;
  emptyDescription: string;
  emptyTitle: string;
  moveNote: string;
  quickCaptureLabel: string;
  recentTitle: string;
  searchPlaceholder: string;
  noteListDescription: string;
  noteListTitle: string;
  renameFolder: string;
  renameNote: string;
  trashTitle: string;
};

type NotebookSidebarProps = {
  activePath: string | null;
  collapsed: boolean;
  copy: NotebookSidebarCopy;
  deletedCount: number;
  isLoading: boolean;
  loadingLabel: string;
  noteSummaries: NotebookNoteSummary[];
  query: string;
  recentNotes: NotebookNoteSummary[];
  treeNodes: NotebookTreeNode[];
  treeFileCount: number;
  onOpenCreate: () => void;
  onOpenCreateFolder: () => void;
  onOpenCreateInDirectory: (directory: string) => void;
  onOpenDeleteDirectory: (directory: string) => void;
  onOpenDeleteNote: (noteId: string) => void;
  onMoveDirectoryToDirectory: (directory: string, parentDirectory: string) => void;
  onOpenMoveNote: (noteId: string) => void;
  onMoveNodeToRoot: (payload: DragPayload) => void;
  onOpenQuickCapture: () => void;
  onMoveNoteToDirectory: (noteId: string, directory: string) => void;
  onOpenRenameDirectory: (directory: string) => void;
  onOpenRenameNote: (noteId: string) => void;
  onOpenCreateSubfolder: (directory: string) => void;
  onQueryChange: (value: string) => void;
  onOpenTrash: () => void;
  onSelectNote: (noteId: string | null) => void;
  onToggleCollapse: () => void;
};

export function NotebookSidebar({
  activePath,
  collapsed,
  copy,
  deletedCount,
  isLoading,
  loadingLabel,
  noteSummaries,
  query,
  recentNotes,
  treeNodes,
  treeFileCount,
  onOpenCreate,
  onOpenCreateFolder,
  onOpenCreateInDirectory,
  onOpenDeleteDirectory,
  onOpenDeleteNote,
  onMoveDirectoryToDirectory,
  onOpenMoveNote,
  onMoveNodeToRoot,
  onOpenQuickCapture,
  onMoveNoteToDirectory,
  onOpenRenameDirectory,
  onOpenRenameNote,
  onOpenCreateSubfolder,
  onQueryChange,
  onOpenTrash,
  onSelectNote,
  onToggleCollapse,
}: NotebookSidebarProps) {
  const queryText = query.trim().toLowerCase();
  const visibleTreeNodes = filterNotebookTreeNodes(treeNodes, query);
  const pinnedNotes = noteSummaries.filter((note) => note.is_pinned);
  const visiblePinnedNotes = filterNotebookSummaries(pinnedNotes, queryText);
  const visibleRecentNotes = filterNotebookSummaries(
    buildRecentNotebookNotes(recentNotes, 5),
    queryText,
  );
  const hasTreeContent = hasNotebookTreeContent(treeNodes);
  const noteTitleById = new Map(
    noteSummaries.map((note) => [note.note_id, note.title]),
  );

  if (collapsed) {
    return (
      <aside className="flex h-full w-full min-w-0 flex-col items-center rounded-[1.5rem] border border-[var(--notebook-border)] bg-[var(--notebook-sidebar)] px-2 py-3 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.35)] transition-[background-color,border-color,box-shadow] duration-300">
        <div className="flex w-full justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent bg-[var(--notebook-panel)] text-[var(--notebook-soft-text)] shadow-[0_10px_25px_-20px_rgba(0,0,0,0.4)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[var(--notebook-border)] hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
            title="展开左侧栏"
          >
            <ChevronRightIcon className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full min-w-0 flex-col rounded-[1.5rem] border border-[var(--notebook-border)] bg-[var(--notebook-sidebar)] shadow-[0_10px_30px_-24px_rgba(0,0,0,0.35)] transition-[background-color,border-color,box-shadow] duration-300">
      <div className="border-b border-[var(--notebook-border)] p-4 pb-3">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--notebook-brand)] text-xs font-bold text-[var(--notebook-panel)]">
            N
          </div>
          <span className="flex-1 text-[15px] font-semibold text-[var(--notebook-ink)]">Nion Notebook</span>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
            title="收起左侧栏"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
        </div>

        <div className="relative mb-4">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--notebook-soft-text)]" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="h-9 rounded-md border-[var(--notebook-border)] bg-[var(--notebook-muted)] pr-3 pl-8 text-sm text-[var(--notebook-ink)] shadow-none placeholder:text-[var(--notebook-soft-text)] focus-visible:ring-1 focus-visible:ring-[var(--notebook-brand)]"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenCreate}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] px-3 py-2 text-sm font-medium text-[var(--notebook-ink)] transition-colors hover:bg-[var(--notebook-hover)]"
          >
            <FolderPlusIcon className="size-4" />
            <span>{copy.createNote}</span>
          </button>
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[var(--notebook-brand)] px-3 py-2 text-sm font-medium text-[var(--notebook-panel)] transition-opacity hover:opacity-90"
          >
            <SparklesIcon className="size-4" />
            <span>{copy.quickCaptureLabel}</span>
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-2.5 py-4">
        <div className="space-y-5">
          {visiblePinnedNotes.length > 0 ? (
            <section>
              <SectionLabel label="已固定" />
              <div className="space-y-0.5">
                {visiblePinnedNotes.map((note) => (
                  <NotebookLeafRow
                    key={note.note_id}
                    active={note.relative_path === activePath}
                    icon={<PinIcon className="size-3.5 text-[var(--notebook-soft-text)]" />}
                    title={note.title}
                    subtitle={null}
                    onClick={() => onSelectNote(note.note_id)}
                    withHoverActions={false}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <SectionLabel label={copy.recentTitle} />
            <div className="space-y-0.5">
              {visibleRecentNotes.map((note) => (
                <NotebookLeafRow
                  key={note.note_id}
                  active={note.relative_path === activePath}
                  icon={<ClockIcon className="size-3.5 text-[var(--notebook-soft-text)]" />}
                  title={note.title}
                  subtitle={null}
                  onClick={() => onSelectNote(note.note_id)}
                  withHoverActions={false}
                />
              ))}
            </div>
          </section>

          <section>
            <SectionLabel
              actionLabel={copy.createFolder}
              label={copy.noteListTitle}
              onAction={onOpenCreateFolder}
            />
            {isLoading ? (
              <div className="px-2 py-2 text-sm text-[var(--notebook-soft-text)]">{loadingLabel}</div>
            ) : !hasTreeContent ? (
              <div className="rounded-xl border border-dashed border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4 text-sm text-[var(--notebook-soft-text)]">
                <div className="mb-1 font-medium text-[var(--notebook-ink)]">{copy.emptyTitle}</div>
                <div>{copy.emptyDescription}</div>
              </div>
            ) : (
              <NotebookTreeView
                activePath={activePath}
                copy={{
                  createNoteHere: copy.createNoteHere,
                  createSubfolder: copy.createSubfolder,
                  deleteFolder: copy.deleteFolder,
                  deleteNote: copy.deleteNote,
                  moveNote: copy.moveNote,
                  renameFolder: copy.renameFolder,
                  renameNote: copy.renameNote,
                }}
                noteTitleById={noteTitleById}
                nodes={visibleTreeNodes}
                onCreateNoteInDirectory={onOpenCreateInDirectory}
                onCreateSubfolder={onOpenCreateSubfolder}
                onDeleteDirectory={onOpenDeleteDirectory}
                onDeleteNote={onOpenDeleteNote}
                onMoveDirectoryToDirectory={onMoveDirectoryToDirectory}
                onMoveNote={onOpenMoveNote}
                onMoveNodeToRoot={onMoveNodeToRoot}
                onMoveNoteToDirectory={onMoveNoteToDirectory}
                onRenameDirectory={onOpenRenameDirectory}
                onRenameNote={onOpenRenameNote}
                onSelectNote={onSelectNote}
              />
            )}
          </section>
        </div>
      </div>

      <div className="border-t border-[var(--notebook-border)] p-2">
        <button
          type="button"
          onClick={onOpenTrash}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
        >
          <Trash2Icon className="size-4 text-[var(--notebook-soft-text)]" />
          <span>{copy.trashTitle}</span>
          {deletedCount > 0 ? (
            <span className="ml-auto rounded-full bg-[var(--notebook-muted)] px-1.5 py-0.5 text-xs text-[var(--notebook-soft-text)]">
              {deletedCount}
            </span>
          ) : null}
        </button>
      </div>
    </aside>
  );
}

function SectionLabel({
  actionLabel,
  label,
  onAction,
}: {
  actionLabel?: string;
  label: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-1 flex items-center justify-between gap-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--notebook-soft-text)]">
      <span>{label}</span>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function NotebookLeafRow({
  active,
  icon,
  title,
  subtitle,
  onClick,
  withHoverActions,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string | null;
  onClick: () => void;
  withHoverActions: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${active ? "bg-[var(--notebook-active)] font-medium text-[var(--notebook-ink)]" : "text-[var(--notebook-soft-text)] hover:bg-[var(--notebook-hover)]"}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {subtitle ? (
        <span className="text-xs text-[var(--notebook-soft-text)]">{subtitle}</span>
      ) : null}
      {withHoverActions ? (
        <span className="absolute right-2 hidden items-center pl-4 group-hover:flex">
          <MoreHorizontalIcon className="size-4 text-[var(--notebook-soft-text)]" />
        </span>
      ) : null}
    </button>
  );
}

function filterNotebookSummaries(
  notes: NotebookNoteSummary[],
  query: string,
) {
  if (!query) {
    return notes;
  }
  return notes.filter((note) => {
    return (
      note.title.toLowerCase().includes(query) ||
      note.relative_path.toLowerCase().includes(query) ||
      note.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });
}
