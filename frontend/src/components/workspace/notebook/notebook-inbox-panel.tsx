"use client";

import { Clock3Icon, FileIcon, FileTextIcon, InboxIcon, MoveRightIcon } from "lucide-react";

import { NotebookFolderPicker } from "./notebook-folder-picker";
import type { NotebookInboxItem } from "@/core/notebook";
import type { NotebookDirectoryOption } from "@/core/notebook";

type NotebookInboxPanelCopy = {
  inboxLabel: string;
  recentTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  knowledgeQueueLabel: string;
  knowledgeStatusLabel: string;
  organizeLabel: string;
  selectFolderPlaceholder: string;
};

type NotebookInboxPanelProps = {
  copy: NotebookInboxPanelCopy;
  directoryOptions: NotebookDirectoryOption[];
  inboxItems: NotebookInboxItem[];
  moveDirectory: string;
  onSelectItem: (item: NotebookInboxItem) => void;
  onMoveDirectoryChange: (value: string) => void;
  onOrganizeItem: (item: NotebookInboxItem) => void;
  onSendToKnowledge: (item: NotebookInboxItem) => void;
  onViewKnowledgeStatus: (item: NotebookInboxItem) => void;
};

export function NotebookInboxPanel({
  copy,
  directoryOptions,
  inboxItems,
  moveDirectory,
  onSelectItem,
  onMoveDirectoryChange,
  onOrganizeItem,
  onSendToKnowledge,
  onViewKnowledgeStatus,
}: NotebookInboxPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4">
      <section className="rounded-2xl border border-[var(--notebook-border)] bg-[var(--notebook-sidebar)] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--notebook-ink)]">
          <InboxIcon className="size-4 text-[var(--notebook-soft-text)]" />
          <span>{copy.inboxLabel}</span>
        </div>
        <p className="text-sm text-[var(--notebook-soft-text)]">
          新进入 Notebook 的内容会先出现在这里，之后再由你决定是否整理到其他目录。
        </p>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--notebook-border)] bg-[var(--notebook-shell)]">
        <div className="flex items-center gap-2 border-b border-[var(--notebook-border)] px-4 py-3 text-sm font-semibold text-[var(--notebook-ink)]">
          <Clock3Icon className="size-4 text-[var(--notebook-soft-text)]" />
          <span>{copy.recentTitle || "Recent"}</span>
        </div>
        <div className="custom-scrollbar flex max-h-full min-h-0 flex-col overflow-y-auto p-2">
          {inboxItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4 text-sm text-[var(--notebook-soft-text)]">
              <div className="mb-1 font-medium text-[var(--notebook-ink)]">{copy.emptyTitle}</div>
              <div>{copy.emptyDescription}</div>
            </div>
          ) : (
            inboxItems.map((entry) => (
              <button
                key={entry.inbox_id}
                type="button"
                onClick={() => onSelectItem(entry)}
                className="flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--notebook-hover)]"
              >
                <span className="mt-0.5 shrink-0 text-[var(--notebook-soft-text)]">
                  {entry.entry_type === "asset" ? (
                    <FileIcon className="size-4" />
                  ) : entry.entry_type === "note" ? (
                    <FileTextIcon className="size-4" />
                  ) : (
                    <FileIcon className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--notebook-ink)]">
                    {entry.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[var(--notebook-soft-text)]">
                    {entry.relative_path}
                  </span>
                  {entry.summary ? (
                    <span className="mt-1 block line-clamp-2 text-xs text-[var(--notebook-soft-text)]">
                      {entry.summary}
                    </span>
                  ) : null}
                </span>
                <span className="ml-3 flex shrink-0 items-center gap-2">
                  <div className="w-44">
                    <NotebookFolderPicker
                      options={directoryOptions}
                      placeholder={copy.selectFolderPlaceholder}
                      value={moveDirectory}
                      onValueChange={onMoveDirectoryChange}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOrganizeItem(entry);
                    }}
                    className="flex items-center gap-1 rounded-md border border-[var(--notebook-border)] px-2 py-1 text-xs text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
                  >
                    <MoveRightIcon className="size-3.5" />
                    <span>{copy.organizeLabel}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSendToKnowledge(entry);
                    }}
                    className="flex items-center gap-1 rounded-md border border-[var(--notebook-border)] px-2 py-1 text-xs text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
                  >
                    <span>{copy.knowledgeQueueLabel}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewKnowledgeStatus(entry);
                    }}
                    className="flex items-center gap-1 rounded-md border border-[var(--notebook-border)] px-2 py-1 text-xs text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
                  >
                    <span>{copy.knowledgeStatusLabel}</span>
                  </button>
                </span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
