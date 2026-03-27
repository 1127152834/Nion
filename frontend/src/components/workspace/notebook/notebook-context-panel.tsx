"use client";

import {
  ArrowRight,
  Bot,
  CheckSquare,
  ChevronLeftIcon,
  ChevronRightIcon,
  Copy,
  FileText,
  History,
  Info,
  List,
  MessageSquare,
  RefreshCw,
  Save,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type {
  NotebookAssistAction,
  NotebookAssistPreview,
  NotebookHistoryEntry,
  NotebookImportInput,
  NotebookImportSource,
  NotebookMetadataInput,
  NotebookNote,
  NotebookSelection,
} from "@/core/notebook";
import {
  useApplyNotebookAssist,
  useImportNotebookContent,
  useNotebookHistoryDetail,
  useNotebookImportSources,
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
  collapsed: boolean;
  copy: NotebookContextPanelCopy;
  currentBody: string;
  currentContentHash: string;
  entries: NotebookHistoryEntry[];
  note: NotebookNote | null;
  notePath: string | null;
  selection: NotebookSelection | null;
  noteTitle: string;
  onActiveTabChange: (tab: NotebookContextTab) => void;
  onApplyNote: (note: NotebookNote) => void;
  onStartConversation: (input: {
    action: NotebookAssistAction;
    mode?: "note" | "selection" | "preview";
    previewContent?: string;
  }) => void;
  onToggleCollapse: () => void;
};

const ASSIST_ACTIONS: Array<{
  key: NotebookAssistAction;
  title: string;
  description: string;
  icon: React.ReactNode;
  full?: boolean;
}> = [
  {
    key: "summarize",
    title: "生成摘要",
    description: "为当前笔记生成结构化摘要",
    icon: <FileText className="size-5" />,
  },
  {
    key: "rewrite",
    title: "重写润色",
    description: "改善表达但保留原意",
    icon: <RefreshCw className="size-5" />,
  },
  {
    key: "expand",
    title: "扩展内容",
    description: "补充背景、细节和下一步",
    icon: <ArrowRight className="size-5" />,
  },
  {
    key: "checklist",
    title: "生成清单",
    description: "整理成可勾选的执行清单",
    icon: <CheckSquare className="size-5" />,
  },
  {
    key: "action_items",
    title: "提取行动项",
    description: "抽取可执行任务和跟进点",
    icon: <List className="size-5" />,
    full: true,
  },
];

export function NotebookContextPanel({
  activeTab,
  collapsed,
  copy,
  currentBody,
  currentContentHash,
  entries,
  note,
  notePath,
  selection,
  noteTitle,
  onActiveTabChange,
  onApplyNote,
  onStartConversation,
  onToggleCollapse,
}: NotebookContextPanelProps) {
  const [aiPreview, setAiPreview] = useState<NotebookAssistPreview | null>(null);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [expansionIntent, setExpansionIntent] = useState<"background" | "details" | "examples" | "next_steps">("details");
  const [historyPreviewId, setHistoryPreviewId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<NotebookAssistAction | null>(null);
  const [previewBaseBody, setPreviewBaseBody] = useState("");
  const [previewSelection, setPreviewSelection] = useState<NotebookSelection | null>(null);
  const [rewriteTone, setRewriteTone] = useState<"clear" | "formal" | "concise">("clear");
  const [scopePreference, setScopePreference] = useState<"auto" | "selection" | "paragraph" | "whole_note">("auto");
  const [tagInput, setTagInput] = useState("");
  const [copiedPreview, setCopiedPreview] = useState(false);
  const previewAssist = usePreviewNotebookAssist(note?.note_id ?? "");
  const applyAssist = useApplyNotebookAssist(note?.note_id ?? "");
  const updateMetadata = useUpdateNotebookMetadata(note?.note_id ?? "");
  const importContent = useImportNotebookContent(note?.note_id ?? "");
  const {
    importSources,
    isLoading: importSourcesLoading,
    error: importSourcesError,
    refetch: refetchImportSources,
  } = useNotebookImportSources("chat");
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

  const currentNoteTitle = useMemo(() => {
    const title = noteTitle.trim() || (note?.title.trim() ?? "");
    return title.length > 0 ? title : "未命名笔记";
  }, [note, noteTitle]);

  const importSourceErrorMessage = importError ?? errorMessage(importSourcesError);
  const secondaryApplyMode = aiPreview ? getSecondaryApplyMode(aiPreview) : null;

  async function handleAiAction(action: NotebookAssistAction) {
    if (!note) return;
    const scope = resolveAssistScope(action, selection, scopePreference);
    setAssistError(null);
    setAiPreview(null);
    setPendingAction(action);
    try {
      const preview = await previewAssist.mutateAsync({
        action,
        title: currentNoteTitle,
        body: currentBody,
        scope,
        selection_start: scope === "selection" ? selection?.start : undefined,
        selection_end: scope === "selection" ? selection?.end : selection?.start,
        options: {
          rewrite_tone: rewriteTone,
          expansion_intent: expansionIntent,
        },
      });
      setAiPreview(preview);
      setPreviewBaseBody(currentBody);
      setPreviewSelection(
        preview.source_start !== null && preview.source_start !== undefined
          ? {
              start: preview.source_start,
              end: preview.source_end ?? preview.source_start,
              text:
                currentBody.slice(
                  preview.source_start,
                  preview.source_end ?? preview.source_start,
                ),
            }
          : null,
      );
    } catch (error) {
      setAssistError(errorMessage(error) ?? "生成失败，请稍后重试。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleApplyPreview(
    mode: "replace" | "insert" | "replace_selection" | "insert_after_selection",
  ) {
    if (!note || !aiPreview) return;
    if (currentBody !== previewBaseBody) {
      setAssistError("笔记内容已变化，请重新生成结果后再写回。");
      return;
    }
    setAssistError(null);
    try {
      const updated = await applyAssist.mutateAsync({
        action: aiPreview.action as NotebookAssistAction,
        mode,
        content: aiPreview.content,
        expected_content_hash: currentContentHash,
        current_body: previewBaseBody,
        selection_start: previewSelection?.start,
        selection_end: previewSelection?.end,
      });
      onApplyNote(updated);
      setAiPreview(null);
      setPreviewBaseBody("");
      setPreviewSelection(null);
    } catch (error) {
      setAssistError(errorMessage(error) ?? "写回笔记失败，请稍后重试。");
    }
  }

  async function handleImportFromChat(source: NotebookImportSource) {
    if (!note) return;
    setImportError(null);
    const payload: NotebookImportInput = {
      source: "chat",
      content: source.content,
      mode: "append",
      expected_content_hash: currentContentHash,
    };
    try {
      const updated = await importContent.mutateAsync(payload);
      onApplyNote(updated);
    } catch (error) {
      setImportError(errorMessage(error) ?? "导入失败，请稍后重试。");
    }
  }

  async function handleCopyPreview() {
    if (!aiPreview) {
      return;
    }
    try {
      await navigator.clipboard.writeText(aiPreview.content);
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 1500);
    } catch (error) {
      setAssistError(errorMessage(error) ?? "复制失败，请检查系统剪贴板权限。");
    }
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
          Ask Nion
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

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
        {!note ? (
          <div className="text-sm text-[var(--notebook-soft-text)]">{copy.noSelectionDescription}</div>
        ) : activeTab === "ask" ? (
          <div className="space-y-5">
            <section className="rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--notebook-soft-text)]">
                当前协作上下文
              </div>
              <div className="mt-2 text-sm font-medium text-[var(--notebook-ink)]">{currentNoteTitle}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--notebook-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--notebook-soft-text)]">
                  {contextAvailabilityLabel(selection)}
                </span>
                <span className="rounded-full bg-[var(--notebook-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--notebook-soft-text)]">
                  {aiPreview ? assistKindLabel(aiPreview.kind) : "先生成结果，再决定如何写回"}
                </span>
              </div>
            </section>

            {!aiPreview ? (
              <section className="rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--notebook-soft-text)]">
                  协作参数
                </div>
                <div className="mt-3 space-y-3">
                  <ConfigRow label="作用范围">
                    {[
                      { value: "auto", label: "自动" },
                      { value: "selection", label: "当前选中" },
                      { value: "paragraph", label: "当前段落" },
                      { value: "whole_note", label: "整篇笔记" },
                    ].map((option) => (
                      <ChipButton
                        key={option.value}
                        active={scopePreference === option.value}
                        label={option.label}
                        onClick={() =>
                          setScopePreference(option.value as "auto" | "selection" | "paragraph" | "whole_note")
                        }
                      />
                    ))}
                  </ConfigRow>
                  <ConfigRow label="rewriteTone">
                    {[
                      { value: "clear", label: "更清晰" },
                      { value: "formal", label: "更正式" },
                      { value: "concise", label: "更简洁" },
                    ].map((option) => (
                      <ChipButton
                        key={option.value}
                        active={rewriteTone === option.value}
                        label={option.label}
                        onClick={() =>
                          setRewriteTone(option.value as "clear" | "formal" | "concise")
                        }
                      />
                    ))}
                  </ConfigRow>
                  <ConfigRow label="expansionIntent">
                    {[
                      { value: "background", label: "补背景" },
                      { value: "details", label: "补细节" },
                      { value: "examples", label: "补例子" },
                      { value: "next_steps", label: "补下一步" },
                    ].map((option) => (
                      <ChipButton
                        key={option.value}
                        active={expansionIntent === option.value}
                        label={option.label}
                        onClick={() =>
                          setExpansionIntent(
                            option.value as "background" | "details" | "examples" | "next_steps",
                          )
                        }
                      />
                    ))}
                  </ConfigRow>
                </div>
              </section>
            ) : null}

            {assistError ? (
              <InlineFeedbackCard
                actionLabel="重试生成"
                message={assistError}
                onAction={() => pendingAction ? void handleAiAction(pendingAction) : setAssistError(null)}
                tone="error"
              />
            ) : null}

            {previewAssist.isPending && pendingAction ? (
              <section className="rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--notebook-ink)]">
                  <Sparkles className="size-4 animate-pulse" />
                  正在生成 {actionTitleOf(pendingAction)}
                </div>
                <p className="mt-2 text-sm text-[var(--notebook-soft-text)]">
                  Nion 正在分析当前整篇笔记并准备结果，请稍候。
                </p>
              </section>
            ) : aiPreview ? (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-4 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center text-sm font-semibold text-[var(--notebook-ink)]">
                    <Sparkles className="mr-1.5 size-3.5" />
                    {aiPreview.action_label} 预览
                  </h3>
                  <button
                    onClick={() => setAiPreview(null)}
                    className="text-xs text-[var(--notebook-soft-text)] transition-colors hover:text-[var(--notebook-ink)]"
                  >
                    返回
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--notebook-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--notebook-soft-text)]">
                    {scopeLabel(aiPreview.scope)}
                  </span>
                  <span className="rounded-full bg-[var(--notebook-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--notebook-soft-text)]">
                    {assistKindLabel(aiPreview.kind)}
                  </span>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--notebook-soft-text)]">
                      原文片段
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--notebook-ink)]">
                      {aiPreview.source_excerpt || "整篇笔记"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--notebook-soft-text)]">
                      生成结果
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--notebook-ink)]">
                      {aiPreview.content}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => void handleApplyPreview(aiPreview.recommended_mode)}
                    disabled={applyAssist.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--notebook-brand)] py-2 text-sm font-medium text-[var(--notebook-panel)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiPreview.recommended_mode === "replace" ? (
                      <RefreshCw className="size-4" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    <span>{primaryApplyLabel(aiPreview)}</span>
                  </button>

                  {secondaryApplyMode ? (
                    <button
                      onClick={() => void handleApplyPreview(secondaryApplyMode)}
                      disabled={applyAssist.isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] py-2 text-sm font-medium text-[var(--notebook-ink)] transition-colors hover:bg-[var(--notebook-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ArrowRight className="size-4" />
                      <span>{secondaryApplyLabel(secondaryApplyMode)}</span>
                    </button>
                  ) : null}

                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleCopyPreview()}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] py-1.5 text-xs font-medium text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
                    >
                      <Copy className="size-3" />
                      <span>{copiedPreview ? "已复制" : "复制结果"}</span>
                    </button>
                    <button
                      onClick={() =>
                        onStartConversation({
                          action: aiPreview.action as NotebookAssistAction,
                          mode: "preview",
                          previewContent: aiPreview.content,
                        })
                      }
                      className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] py-1.5 text-xs font-medium text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
                    >
                      <MessageSquare className="size-3" />
                      <span>带当前结果继续聊</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--notebook-ink)]">
                      协作建议
                    </h3>
                    <p className="mt-1 text-sm text-[var(--notebook-soft-text)]">
                      所有动作都基于当前整篇笔记生成真实结果，并保留历史以便回退。
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ASSIST_ACTIONS.map((action) => (
                      <button
                        key={action.key}
                        onClick={() => void handleAiAction(action.key)}
                        disabled={previewAssist.isPending || applyAssist.isPending}
                        className={`flex flex-col items-start justify-between rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3 text-left transition-all hover:border-[var(--notebook-brand)] hover:bg-[var(--notebook-hover)] disabled:cursor-not-allowed disabled:opacity-60 ${action.full ? "col-span-2" : ""}`}
                      >
                        <div className="mb-3 rounded-lg bg-[var(--notebook-muted)] p-2 text-[var(--notebook-ink)]">
                          {action.icon}
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-[var(--notebook-ink)]">{action.title}</div>
                          <div className="text-xs leading-5 text-[var(--notebook-soft-text)]">
                            {action.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-2 border-t border-[var(--notebook-border)] pt-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--notebook-ink)]">
                      从对话导入
                    </h3>
                    <p className="mt-1 text-sm text-[var(--notebook-soft-text)]">
                      从最近的 AI 回复里挑一条，直接补充到当前笔记末尾。
                    </p>
                  </div>

                  {importSourceErrorMessage ? (
                    <InlineFeedbackCard
                      actionLabel="重新加载"
                      message={importSourceErrorMessage}
                      onAction={() => {
                        setImportError(null);
                        void refetchImportSources();
                      }}
                      tone="error"
                    />
                  ) : null}

                  {importSourcesLoading ? (
                    <div className="rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4 text-sm text-[var(--notebook-soft-text)]">
                      正在读取最近对话...
                    </div>
                  ) : importSources.length > 0 ? (
                    <div className="space-y-2">
                      {importSources.slice(0, 3).map((source) => (
                        <div
                          key={source.id}
                          className="rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3"
                        >
                          <div className="mb-2 flex items-start gap-2">
                            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--notebook-muted)]">
                              <Bot className="size-3 text-[var(--notebook-ink)]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-xs font-medium text-[var(--notebook-ink)]">
                                  {source.thread_title}
                                </div>
                                <div className="text-[11px] text-[var(--notebook-soft-text)]">
                                  {formatTimeAgo(source.updated_at)}
                                </div>
                              </div>
                              <p className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--notebook-soft-text)]">
                                {source.preview_text}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => void handleImportFromChat(source)}
                            disabled={importContent.isPending}
                            className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] py-1.5 text-xs font-medium text-[var(--notebook-ink)] transition-colors hover:bg-[var(--notebook-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Save className="size-3" />
                            <span>追加到当前笔记</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-4 text-sm text-[var(--notebook-soft-text)]">
                      暂时没有可导入的对话内容。
                    </div>
                  )}
                </section>

                <section className="space-y-2 border-t border-[var(--notebook-border)] pt-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--notebook-ink)]">
                      开启对话
                    </h3>
                    <p className="mt-1 text-sm text-[var(--notebook-soft-text)]">
                      带着这篇笔记继续聊，Nion 会把当前笔记作为上下文来继续分析、改写或拆解任务。
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] p-3">
                    <div className="space-y-2">
                      {selection?.text.trim() ? (
                        <button
                          onClick={() =>
                            onStartConversation({
                              action: "rewrite",
                              mode: "selection",
                            })
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] py-2 text-sm font-medium text-[var(--notebook-ink)] transition-colors hover:bg-[var(--notebook-hover)]"
                        >
                          <MessageSquare className="size-4" />
                          <span>带当前选中继续聊</span>
                        </button>
                      ) : null}
                      <button
                        onClick={() =>
                          onStartConversation({
                            action: "rewrite",
                            mode: "note",
                          })
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--notebook-brand)] py-2 text-sm font-medium text-[var(--notebook-panel)] transition-opacity hover:opacity-90"
                      >
                        <MessageSquare className="size-4" />
                        <span>带整篇笔记继续聊</span>
                      </button>
                    </div>
                  </div>
                </section>
              </>
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

function assistKindLabel(kind: NotebookAssistPreview["kind"]) {
  return kind === "rewrite" ? "改写类结果" : "派生结果";
}

function actionTitleOf(action: NotebookAssistAction) {
  return ASSIST_ACTIONS.find((item) => item.key === action)?.title ?? action;
}

function primaryApplyLabel(preview: NotebookAssistPreview) {
  if (preview.recommended_mode === "replace_selection") {
    return "替换选中内容";
  }
  if (preview.recommended_mode === "insert_after_selection") {
    return "插入到选中内容后";
  }
  if (preview.action === "summarize") {
    return "插入为摘要区块";
  }
  if (preview.action === "checklist") {
    return "插入为清单区块";
  }
  if (preview.action === "action_items") {
    return "插入为行动项";
  }
  if (preview.recommended_mode === "replace") {
    return "替换当前笔记";
  }
  return "追加到笔记末尾";
}

function getSecondaryApplyMode(preview: NotebookAssistPreview) {
  return preview.available_modes.find((mode) => mode !== preview.recommended_mode) ?? null;
}

function secondaryApplyLabel(
  mode: "replace" | "insert" | "replace_selection" | "insert_after_selection",
) {
  if (mode === "replace_selection") {
    return "替换选中内容";
  }
  if (mode === "insert_after_selection") {
    return "插入到选中内容后";
  }
  return mode === "replace" ? "替换当前笔记" : "插入到笔记末尾";
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return null;
}

function resolveAssistScope(
  action: NotebookAssistAction,
  selection: NotebookSelection | null,
  scopePreference: "auto" | "selection" | "paragraph" | "whole_note",
): "whole_note" | "selection" | "paragraph" {
  if (scopePreference === "whole_note") {
    return "whole_note";
  }
  if (scopePreference === "selection" && selection?.text.trim()) {
    return "selection";
  }
  if (scopePreference === "paragraph" && selection) {
    return "paragraph";
  }
  if ((action === "rewrite" || action === "expand") && selection?.text.trim()) {
    return "selection";
  }
  if (action === "expand" && selection) {
    return "paragraph";
  }
  return "whole_note";
}

function scopeLabel(scope: "whole_note" | "selection" | "paragraph") {
  if (scope === "selection") {
    return "当前选中";
  }
  if (scope === "paragraph") {
    return "当前段落";
  }
  return "整篇笔记";
}

function contextAvailabilityLabel(selection: NotebookSelection | null) {
  if (!selection) {
    return "整篇笔记";
  }
  if (selection.text.trim()) {
    return "当前选中可用";
  }
  return "当前段落可用";
}

function ConfigRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--notebook-soft-text)]">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ChipButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--notebook-brand)] text-[var(--notebook-panel)]"
          : "bg-[var(--notebook-muted)] text-[var(--notebook-soft-text)] hover:bg-[var(--notebook-hover)] hover:text-[var(--notebook-ink)]"
      }`}
    >
      {label}
    </button>
  );
}

function InlineFeedbackCard({
  actionLabel,
  message,
  onAction,
  tone,
}: {
  actionLabel: string;
  message: string;
  onAction: () => void;
  tone: "error" | "warning";
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        tone === "error"
          ? "border-[#f4c7cc] bg-[var(--notebook-danger-surface)] text-[var(--notebook-danger)]"
          : "border-[#ffe58f] bg-[var(--notebook-warning-surface)] text-[var(--notebook-warning)]"
      }`}
    >
      <div>{message}</div>
      <button onClick={onAction} className="mt-2 text-xs font-medium underline">
        {actionLabel}
      </button>
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
