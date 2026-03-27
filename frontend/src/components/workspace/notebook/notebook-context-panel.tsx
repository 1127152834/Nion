"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckSquare, Copy, FileText, History, Info, List, MessageSquare, RefreshCw, Save, Sparkles, Tag, User, Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  NotebookAssistAction,
  NotebookAssistPreview,
  NotebookHistoryDetail,
  NotebookHistoryEntry,
  NotebookImportInput,
  NotebookMetadataInput,
  NotebookNote,
} from "@/core/notebook";
import {
  useApplyNotebookAssist,
  useImportNotebookContent,
  useNotebookHistoryDetail,
  usePreviewNotebookAssist,
  useUpdateNotebookMetadata,
} from "@/core/notebook";
import { formatTimeAgo } from "@/core/utils/datetime";

type NotebookContextTab = "ask" | "history" | "info";

type NotebookContextPanelCopy = {
  assistActionItems: string;
  assistChecklist: string;
  assistDescription: string;
  assistExpand: string;
  assistRewrite: string;
  assistSummarize: string;
  assistTitle: string;
  askTab: string;
  historyTab: string;
  infoContentHash: string;
  infoCreatedAt: string;
  infoNoteId: string;
  infoPath: string;
  infoTab: string;
  infoUpdatedAt: string;
  historyTitle: string;
  noSelectionDescription: string;
  restore: string;
  selectNote: string;
};

type NotebookContextPanelProps = {
  activeTab: NotebookContextTab;
  copy: NotebookContextPanelCopy;
  currentContentHash: string;
  entries: NotebookHistoryEntry[];
  note: NotebookNote | null;
  notePath: string | null;
  noteTitle: string;
  onActiveTabChange: (tab: NotebookContextTab) => void;
  onApplyNote: (note: NotebookNote) => void;
  onStartConversation: (action: NotebookAssistAction) => void;
};

const ASSIST_ACTIONS: Array<{
  key: NotebookAssistAction;
  title: string;
  icon: React.ReactNode;
  full?: boolean;
}> = [
  { key: "summarize", title: "生成摘要", icon: <FileText className="size-5" /> },
  { key: "rewrite", title: "重写润色", icon: <RefreshCw className="size-5" /> },
  { key: "expand", title: "扩展内容", icon: <ArrowRight className="size-5" /> },
  { key: "checklist", title: "生成清单", icon: <CheckSquare className="size-5" /> },
  { key: "action_items", title: "提取行动项", icon: <List className="size-5" />, full: true },
];

export function NotebookContextPanel({
  activeTab,
  copy,
  currentContentHash,
  entries,
  note,
  notePath,
  noteTitle,
  onActiveTabChange,
  onApplyNote,
  onStartConversation,
}: NotebookContextPanelProps) {
  const [aiPreview, setAiPreview] = useState<NotebookAssistPreview | null>(null);
  const [historyPreviewId, setHistoryPreviewId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const previewAssist = usePreviewNotebookAssist(note?.note_id ?? "");
  const applyAssist = useApplyNotebookAssist(note?.note_id ?? "");
  const updateMetadata = useUpdateNotebookMetadata(note?.note_id ?? "");
  const importContent = useImportNotebookContent(note?.note_id ?? "");
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

  async function handleAiAction(action: NotebookAssistAction) {
    if (!note) return;
    const preview = await previewAssist.mutateAsync({ action });
    setAiPreview(preview);
  }

  async function handleApplyPreview(mode: "replace" | "insert") {
    if (!note || !aiPreview) return;
    const updated = await applyAssist.mutateAsync({
      action: aiPreview.action as NotebookAssistAction,
      mode,
      content: aiPreview.content,
      expected_content_hash: currentContentHash,
    });
    onApplyNote(updated);
    setAiPreview(null);
  }

  async function handleImportFromChat() {
    if (!note) return;
    const payload: NotebookImportInput = {
      source: "chat",
      content: "根据您的要求，这是关于 Alpha 项目的最新市场调研总结...",
      mode: "append",
      expected_content_hash: currentContentHash,
    };
    const updated = await importContent.mutateAsync(payload);
    onApplyNote(updated);
  }

  async function handleTagSave() {
    if (!note) return;
    const tags = tagInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const updated = await updateMetadata.mutateAsync({ tags } satisfies NotebookMetadataInput);
    onApplyNote(updated);
    setTagInput("");
  }

  async function handleRestoreVersion() {
    if (historyPreview?.snapshot) {
      onApplyNote(historyPreview.snapshot);
      setHistoryPreviewId(null);
      onActiveTabChange("ask");
    }
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col border-l border-[var(--notebook-border)] bg-[var(--notebook-sidebar)]">
      <div className="flex border-b border-[var(--notebook-border)] px-2 pt-2">
        <TabButton active={activeTab === "ask"} onClick={() => onActiveTabChange("ask")} icon={<Sparkles className="mr-1.5 size-4" />}>
          Ask Nion
        </TabButton>
        <TabButton active={activeTab === "history"} onClick={() => onActiveTabChange("history")} icon={<History className="mr-1.5 size-4" />}>
          历史
        </TabButton>
        <TabButton active={activeTab === "info"} onClick={() => onActiveTabChange("info")} icon={<Info className="mr-1.5 size-4" />}>
          信息
        </TabButton>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
        {!note ? (
          <div className="text-sm text-[var(--notebook-soft-text)]">{copy.noSelectionDescription}</div>
        ) : activeTab === "ask" ? (
          <div className="space-y-5">
            {!aiPreview ? (
              <>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--notebook-ink)]">协作建议</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {ASSIST_ACTIONS.map((action) => (
                      <button
                        key={action.key}
                        onClick={() => void handleAiAction(action.key)}
                        className={`flex flex-col items-center justify-center rounded-lg border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3 text-[var(--notebook-soft-text)] transition-all hover:border-[var(--notebook-brand)] hover:text-[var(--notebook-ink)] ${action.full ? "col-span-2" : ""}`}
                      >
                        <span className="mb-1.5">{action.icon}</span>
                        <span className="text-xs font-medium">{action.title}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-2 border-t border-[var(--notebook-border)] pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--notebook-ink)]">从对话导入</h3>
                  <div className="rounded-lg border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3">
                    <div className="mb-3 flex items-start">
                      <div className="mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--notebook-muted)]">
                        <Bot className="size-3 text-[var(--notebook-ink)]" />
                      </div>
                      <p className="line-clamp-2 text-xs text-[var(--notebook-soft-text)]">
                        &quot;根据您的要求，这是关于 Alpha 项目的最新市场调研总结...&quot;
                      </p>
                    </div>
                    <button
                      onClick={() => void handleImportFromChat()}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] py-1.5 text-xs font-medium text-[var(--notebook-ink)] transition-colors hover:bg-[var(--notebook-hover)]"
                    >
                      <Save className="size-3" />
                      <span>保存至当前笔记</span>
                    </button>
                  </div>
                </section>

                <section className="space-y-2 border-t border-[var(--notebook-border)] pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--notebook-ink)]">开启对话</h3>
                  <div className="rounded-lg border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3">
                    <p className="mb-3 text-xs text-[var(--notebook-soft-text)]">使用当前笔记作为上下文，开启一段新的 AI 对话。</p>
                    <button
                      onClick={() => onStartConversation("rewrite")}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--notebook-brand)] py-2 text-sm font-medium text-[var(--notebook-panel)] transition-opacity hover:opacity-90"
                    >
                      <MessageSquare className="size-4" />
                      <span>开启对话</span>
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center text-sm font-semibold text-[var(--notebook-ink)]">
                    <Sparkles className="mr-1.5 size-3.5" />
                    {aiPreview.action} 预览
                  </h3>
                  <button onClick={() => setAiPreview(null)} className="text-xs text-[var(--notebook-soft-text)] hover:text-[var(--notebook-ink)]">取消</button>
                </div>
                <div className="rounded-lg border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3 text-sm leading-relaxed whitespace-pre-wrap text-[var(--notebook-ink)]">
                  {aiPreview.content}
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => void handleApplyPreview("replace")}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--notebook-brand)] py-2 text-sm font-medium text-[var(--notebook-panel)] transition-opacity hover:opacity-90"
                  >
                    <RefreshCw className="size-4" />
                    <span>替换当前笔记</span>
                  </button>
                  <button
                    onClick={() => void handleApplyPreview("insert")}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] py-2 text-sm font-medium text-[var(--notebook-ink)] transition-colors hover:bg-[var(--notebook-hover)]"
                  >
                    <ArrowRight className="size-4" />
                    <span>插入到末尾</span>
                  </button>
                  <div className="flex gap-2">
                    <button className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] py-1.5 text-xs font-medium text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)]">
                      <Copy className="size-3" />
                      <span>复制</span>
                    </button>
                    <button className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] py-1.5 text-xs font-medium text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)]">
                      <MessageSquare className="size-3" />
                      <span>发送至对话</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "history" ? (
          <div className="space-y-4">
            {!historyPreview ? (
              <div className="relative ml-3 space-y-5 border-l-2 border-[var(--notebook-border)] py-2">
                {entries.length > 0 ? (
                  entries.map((entry) => (
                    <div key={entry.version_id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--notebook-brand)] bg-[var(--notebook-panel)]">
                        {entry.actor_type === "agent" ? <Bot className="size-2 text-[var(--notebook-ink)]" /> : <User className="size-2 text-[var(--notebook-ink)]" />}
                      </div>
                      <div
                        className="cursor-pointer rounded-lg border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3 transition-all hover:border-[var(--notebook-brand)]"
                        onClick={() => setHistoryPreviewId(entry.version_id)}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--notebook-ink)]">{entry.actor_type === "agent" ? "Nion" : "你"}</span>
                          <span className="text-xs text-[var(--notebook-soft-text)]">{formatTimeAgo(entry.timestamp)}</span>
                        </div>
                        <p className="text-sm text-[var(--notebook-soft-text)]">{entry.operation}</p>
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
                      {historyPreview.entry?.actor_type === "agent" ? "Nion" : "User"}
                    </span>
                  </div>
                  <div className="custom-scrollbar max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-[var(--notebook-ink)]">
                    {historyPreview.snapshot.body}
                  </div>
                </div>

                <div className="rounded-lg border border-[color-mix(in_oklab,var(--notebook-warning)_28%,transparent)] bg-[var(--notebook-warning-surface)] p-3 text-xs text-[var(--notebook-warning)]">
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
                  <button className="text-[var(--notebook-ink)] hover:underline" onClick={() => void handleTagSave()}>编辑</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {note.tags.length > 0 ? (
                    note.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center rounded-md bg-[var(--notebook-muted)] px-2 py-1 text-xs font-medium text-[var(--notebook-soft-text)]">
                        <Tag className="mr-1 size-2.5" />
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--notebook-soft-text)]">无标签</span>
                  )}
                  <Input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    placeholder="alpha, roadmap"
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
