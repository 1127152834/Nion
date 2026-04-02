"use client";

import { ChevronLeftIcon, ChevronRightIcon, History, Info, Minus, Sparkles, Tag, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { NotebookHistoryEntry, NotebookMetadataInput, NotebookNote } from "@/core/notebook";
import { useNotebookHistoryDetail, useUpdateNotebookMetadata } from "@/core/notebook";
import { formatTimeAgo } from "@/core/utils/datetime";

import { NotebookAssistantPanel } from "./notebook-assistant-panel";
import { summarizeNotebookHistoryEntry } from "./notebook-history-summary";

type NotebookContextTab = "ask" | "history" | "info";

type NotebookContextPanelCopy = {
  askTab: string;
  infoContentHash: string;
  infoCreatedAt: string;
  infoNoteId: string;
  infoPath: string;
  infoUpdatedAt: string;
  noSelectionDescription: string;
};

type NotebookContextPanelProps = {
  activeTab: NotebookContextTab;
  collapsed: boolean;
  copy: NotebookContextPanelCopy;
  entries: NotebookHistoryEntry[];
  note: NotebookNote | null;
  notePath: string | null;
  noteTitle: string;
  notebookAssistantSessionId: string | null;
  onActiveTabChange: (tab: NotebookContextTab) => void;
  onApplyNote: (note: NotebookNote) => void;
  onStartNewConversation: () => void;
  onToggleCollapse: () => void;
};

export function NotebookContextPanel({
  activeTab,
  collapsed,
  copy,
  entries,
  note,
  notePath,
  noteTitle,
  notebookAssistantSessionId,
  onActiveTabChange,
  onApplyNote,
  onStartNewConversation,
  onToggleCollapse,
}: NotebookContextPanelProps) {
  const [historyPreviewId, setHistoryPreviewId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const updateMetadata = useUpdateNotebookMetadata(note?.note_id ?? "");
  const { detail: historyPreview } = useNotebookHistoryDetail(note?.note_id ?? null, historyPreviewId);

  const infoRows = useMemo(() => {
    if (!note) {
      return [];
    }
    return [
      { label: "字数", value: String(note.body.length) },
      { label: copy.infoCreatedAt, value: new Date(note.created_at).toLocaleDateString("zh-CN") },
      { label: copy.infoUpdatedAt, value: new Date(note.updated_at).toLocaleDateString("zh-CN") },
      { label: copy.infoPath, value: notePath ?? note.relative_path },
      { label: copy.infoNoteId, value: note.note_id },
      { label: copy.infoContentHash, value: note.content_hash },
    ];
  }, [copy, note, notePath]);

  const historyItems = useMemo(
    () =>
      entries.map((entry) => ({
        entry,
        summary: summarizeNotebookHistoryEntry(entry),
      })),
    [entries],
  );
  const historyPreviewSummary = useMemo(
    () => (historyPreview ? summarizeNotebookHistoryEntry(historyPreview.entry) : null),
    [historyPreview],
  );

  async function updateTags(tags: string[]) {
    if (!note) return;
    const updated = await updateMetadata.mutateAsync({ tags } satisfies NotebookMetadataInput);
    onApplyNote(updated);
  }

  async function handleTagSubmit(tagValue: string) {
    if (!note) return;
    const nextTag = tagValue.trim();
    if (!nextTag) {
      return;
    }
    if (note.tags.includes(nextTag)) {
      setTagInput("");
      return;
    }
    await updateTags([...note.tags, nextTag]);
    setTagInput("");
  }

  async function handleRemoveTag(tagToRemove: string) {
    if (!note) return;
    await updateTags(note.tags.filter((tag) => tag !== tagToRemove));
  }

  async function handleRestoreVersion() {
    if (historyPreview?.snapshot) {
      onApplyNote(historyPreview.snapshot);
      setHistoryPreviewId(null);
      onActiveTabChange("ask");
    }
  }



  if (collapsed) {
    return (
      <div className="flex h-full w-full min-w-0 flex-col items-center rounded-[1.5rem] border border-[var(--notebook-border)] bg-[var(--notebook-sidebar)] px-2 py-3 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.35)] transition-[background-color,border-color,box-shadow] duration-300">
        <div className="flex w-full justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent bg-[var(--notebook-panel)] text-[var(--notebook-soft-text)] shadow-[0_10px_25px_-20px_rgba(0,0,0,0.4)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[var(--notebook-border)] hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
            title="展开右侧栏"
          >
            <ChevronLeftIcon className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col rounded-[1.5rem] border border-[var(--notebook-border)] bg-[var(--notebook-sidebar)] shadow-[0_10px_30px_-24px_rgba(0,0,0,0.35)] transition-[background-color,border-color,box-shadow] duration-300">
      <div className="flex items-center border-b border-[var(--notebook-border)] px-2 pt-2">
        <TabButton active={activeTab === "ask"} onClick={() => onActiveTabChange("ask")} icon={<Sparkles className="mr-1.5 size-4" />}>
          {copy.askTab || "笔记助手"}
        </TabButton>
        <TabButton active={activeTab === "history"} onClick={() => onActiveTabChange("history")} icon={<History className="mr-1.5 size-4" />}>
          历史
        </TabButton>
        <TabButton active={activeTab === "info"} onClick={() => onActiveTabChange("info")} icon={<Info className="mr-1.5 size-4" />}>
          信息
        </TabButton>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mb-2 ml-1 rounded-md p-1.5 text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
          title="收起右侧栏"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      <div
        className={
          activeTab === "ask"
            ? "flex min-h-0 flex-1 flex-col p-4"
            : "custom-scrollbar flex-1 overflow-y-auto p-4"
        }
      >
        {!note ? (
          <div className="text-sm text-[var(--notebook-soft-text)]">{copy.noSelectionDescription}</div>
        ) : activeTab === "ask" ? (
          <NotebookAssistantPanel
            noteId={note.note_id}
            noteTitle={noteTitle.trim() || note.title.trim() || "未命名笔记"}
            sessionId={notebookAssistantSessionId}
            onStartNewConversation={onStartNewConversation}
          />
        ) : activeTab === "history" ? (
          <div className="space-y-4">
            {!historyPreview ? (
              <div className="relative ml-3 space-y-5 border-l-2 border-[var(--notebook-border)] py-2">
                {entries.length > 0 ? (
                  historyItems.map(({ entry, summary }) => (
                    <div key={entry.version_id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--notebook-brand)] bg-[var(--notebook-panel)]">
                        <Minus className="size-2 text-[var(--notebook-ink)]" />
                      </div>
                      <div
                        className="cursor-pointer rounded-lg border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3 transition-all hover:border-[var(--notebook-brand)]"
                        onClick={() => setHistoryPreviewId(entry.version_id)}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--notebook-ink)]">{summary.title}</span>
                          <span className="text-xs text-[var(--notebook-soft-text)]">{formatTimeAgo(entry.timestamp)}</span>
                        </div>
                        <p className="text-sm text-[var(--notebook-soft-text)]">{summary.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pl-6 text-sm text-[var(--notebook-soft-text)]">暂无历史记录</div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center text-sm font-semibold text-[var(--notebook-ink)]">
                    <History className="mr-1.5 size-3.5" />
                    版本预览
                  </h3>
                  <button onClick={() => setHistoryPreviewId(null)} className="text-xs text-[var(--notebook-soft-text)] hover:text-[var(--notebook-ink)]">返回</button>
                </div>

                <div className="rounded-lg border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-[var(--notebook-soft-text)]">
                    <span>{historyPreview.entry ? new Date(historyPreview.entry.timestamp).toLocaleString("zh-CN") : ""}</span>
                    <span className="rounded bg-[var(--notebook-muted)] px-1.5 py-0.5">
                      {historyPreviewSummary?.description}
                    </span>
                  </div>
                  <div className="custom-scrollbar max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-[var(--notebook-ink)]">
                    {historyPreview.snapshot.body}
                  </div>
                </div>

                <div className="rounded-lg border border-[#ffe58f] bg-[var(--notebook-warning-surface)] p-3 text-xs text-[var(--notebook-warning)]">
                  恢复此版本将创建一个新的历史记录，不会覆盖或删除之后的修改。
                </div>

                <button
                  onClick={() => void handleRestoreVersion()}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--notebook-brand)] py-2 text-sm font-medium text-[var(--notebook-panel)] transition-opacity hover:opacity-90"
                >
                  <History className="size-4" />
                  <span>恢复此版本</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--notebook-soft-text)]">属性</h4>
                <div className="divide-y divide-[var(--notebook-border)] rounded-lg border border-[var(--notebook-border)] bg-[var(--notebook-panel)]">
                  {infoRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between p-3">
                      <span className="text-sm text-[var(--notebook-soft-text)]">{row.label}</span>
                      <span className="max-w-[140px] truncate text-sm font-medium text-[var(--notebook-ink)]">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--notebook-soft-text)]">标签</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {note.tags.length > 0 ? (
                    note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="group inline-flex items-center rounded-md bg-[var(--notebook-muted)] px-2 py-1 text-xs font-medium text-[var(--notebook-soft-text)]"
                      >
                        <Tag className="mr-1 size-2.5" />
                        {tag}
                        <button
                          type="button"
                          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--notebook-soft-text)] opacity-0 transition-opacity hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)] group-hover:opacity-100"
                          onClick={() => void handleRemoveTag(tag)}
                          aria-label={`删除标签 ${tag}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--notebook-soft-text)]">无标签</span>
                  )}
                  <Input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return;
                      }
                      event.preventDefault();
                      void handleTagSubmit(tagInput);
                    }}
                    placeholder="输入标签后按回车"
                    className="h-8 border-dashed border-[var(--notebook-border)] bg-transparent text-xs text-[var(--notebook-ink)] placeholder:text-[var(--notebook-soft-text)]"
                  />
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--notebook-soft-text)]">路径</h4>
                <div className="rounded-lg border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3 font-mono text-sm text-[var(--notebook-ink)]">
                  {notePath ?? note.relative_path}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center border-b-2 py-2 text-sm font-medium transition-colors ${active ? "border-[var(--notebook-brand)] text-[var(--notebook-ink)]" : "border-transparent text-[var(--notebook-soft-text)] hover:text-[var(--notebook-ink)]"}`}
    >
      {icon}
      {children}
    </button>
  );
}
