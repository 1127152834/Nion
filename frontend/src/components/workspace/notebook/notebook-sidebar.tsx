"use client";

import { ClockIcon, FolderPlusIcon, MoreHorizontalIcon, PinIcon, SearchIcon, SparklesIcon, Trash2Icon } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { NotebookNoteSummary, NotebookTreeNode } from "@/core/notebook";

import {
  buildRecentNotebookNotes,
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
  deletedCount: number;
  isLoading: boolean;
  loadingLabel: string;
  noteSummaries: NotebookNoteSummary[];
  query: string;
  recentNotes: NotebookNoteSummary[];
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
  deletedCount,
  isLoading,
  loadingLabel,
  noteSummaries,
  query,
  recentNotes,
  treeNodes,
  treeFileCount,
  onOpenCreate,
  onOpenQuickCapture,
  onQueryChange,
  onOpenTrash,
  onSelectNote,
}: NotebookSidebarProps) {
  const queryText = query.trim().toLowerCase();
  const visibleTreeNodes = filterNotebookTreeNodes(treeNodes, query);
  const pinnedNotes = noteSummaries.filter((note) => note.is_pinned);
  const visiblePinnedNotes = filterNotebookSummaries(pinnedNotes, queryText);
  const visibleRecentNotes = filterNotebookSummaries(
    buildRecentNotebookNotes(recentNotes, 5),
    queryText,
  );
  const noteTitleById = new Map(
    noteSummaries.map((note) => [note.note_id, note.title]),
  );

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-[#E5E5E5] bg-[#F9F9F8]">
      <div className="border-b border-[#E5E5E5] p-4 pb-3">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1A1A1A] text-xs font-bold text-white">
            N
          </div>
          <span className="text-[15px] font-semibold text-[#1A1A1A]">Nion Notebook</span>
        </div>

        <div className="relative mb-4">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#8C8C8C]" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="h-9 rounded-md border-[#E5E5E5] bg-[#EAEAE9] pr-3 pl-8 text-sm shadow-none placeholder:text-[#8C8C8C] focus-visible:ring-1 focus-visible:ring-[#1A1A1A]"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenCreate}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-sm font-medium text-[#1A1A1A] shadow-sm transition-colors hover:bg-[#F0F0F0]"
          >
            <FolderPlusIcon className="size-4" />
            <span>{copy.createNote}</span>
          </button>
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#1A1A1A] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#333333]"
          >
            <SparklesIcon className="size-4" />
            <span>{copy.quickCaptureLabel}</span>
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-6">
          {visiblePinnedNotes.length > 0 ? (
            <section>
              <SectionLabel label="已固定" />
              <div className="space-y-0.5">
                {visiblePinnedNotes.map((note) => (
                  <NotebookLeafRow
                    key={note.note_id}
                    active={note.relative_path === activePath}
                    icon={<PinIcon className="size-3.5 text-[#8C8C8C]" />}
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
                  icon={<ClockIcon className="size-3.5 text-[#8C8C8C]" />}
                  title={note.title}
                  subtitle={null}
                  onClick={() => onSelectNote(note.note_id)}
                  withHoverActions={false}
                />
              ))}
            </div>
          </section>

          <section>
            <SectionLabel label={copy.noteListTitle} />
            {isLoading ? (
              <div className="px-2 py-2 text-sm text-[#8C8C8C]">{loadingLabel}</div>
            ) : treeFileCount === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-white p-4 text-sm text-[#8C8C8C]">
                <div className="mb-1 font-medium text-[#595959]">{copy.emptyTitle}</div>
                <div>{copy.emptyDescription}</div>
              </div>
            ) : (
              <NotebookTreeView
                activePath={activePath}
                noteTitleById={noteTitleById}
                nodes={visibleTreeNodes}
                onSelectNote={onSelectNote}
              />
            )}
          </section>
        </div>
      </div>

      <div className="border-t border-[#E5E5E5] p-2">
        <button
          type="button"
          onClick={onOpenTrash}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-[#595959] transition-colors hover:bg-[#EAEAE9] hover:text-[#1A1A1A]"
        >
          <Trash2Icon className="size-4 text-[#8C8C8C]" />
          <span>{copy.trashTitle}</span>
          {deletedCount > 0 ? (
            <span className="ml-auto rounded-full bg-[#E5E5E5] px-1.5 py-0.5 text-xs text-[#595959]">
              {deletedCount}
            </span>
          ) : null}
        </button>
      </div>
    </aside>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-[#8C8C8C]">
      {label}
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
      className={`group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${active ? "bg-[#EAEAE9] font-medium text-[#1A1A1A]" : "text-[#595959] hover:bg-[#EAEAE9]"}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {subtitle ? <span className="text-xs text-[#8C8C8C]">{subtitle}</span> : null}
      {withHoverActions ? (
        <span className={`absolute right-2 hidden items-center pl-4 group-hover:flex ${active ? "bg-gradient-to-l from-[#EAEAE9] via-[#EAEAE9]" : "bg-gradient-to-l from-[#F9F9F8] via-[#F9F9F8]"}`}>
          <MoreHorizontalIcon className="size-4 text-[#8C8C8C]" />
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
