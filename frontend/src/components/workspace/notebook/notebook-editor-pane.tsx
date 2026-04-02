"use client";

import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Folder,
  History,
  MoreHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NotebookNote, NotebookPendingRewrite, NotebookSelection } from "@/core/notebook";

import { MarkdownContent } from "../messages/markdown-content";

type NotebookEditorPaneCopy = {
  delete: string;
  draftMetaLabel: string;
  edit: string;
  history: string;
  move: string;
  noSelectionCta: string;
  noSelectionDescription: string;
  noSelectionTitle: string;
  noteTitlePlaceholder: string;
  preview: string;
  rename: string;
  saved: string;
  saveDraft: string;
  saving: string;
  selectNote: string;
  untitledDraftTitle: string;
  unsaved: string;
};

type NotebookEditorPaneProps = {
  copy: NotebookEditorPaneCopy;
  draftBody: string;
  draftDirectory: string;
  draftSourceLabel: string;
  draftTitle: string;
  isDraft: boolean;
  isLoading: boolean;
  loadingLabel: string;
  note: NotebookNote | null;
  pendingRewrite: NotebookPendingRewrite | null;
  pendingRewriteActionPending?: boolean;
  saveState: "saved" | "unsaved" | "saving";
  onCancelPendingRewrite: () => void;
  onConfirmPendingRewrite: () => void;
  onDraftBodyChange: (value: string) => void;
  onDraftTitleChange: (value: string) => void;
  onOpenDelete: () => void;
  onOpenHistory: () => void;
  onOpenRename: () => void;
  onOpenMove: () => void;
  onPrimaryCreate: () => void;
  onSaveDraft: () => void;
  onSelectionChange: (selection: NotebookSelection | null) => void;
};

export function NotebookEditorPane({
  copy,
  draftBody,
  draftDirectory: _draftDirectory,
  draftSourceLabel,
  draftTitle,
  isDraft,
  isLoading,
  loadingLabel,
  note,
  pendingRewrite,
  pendingRewriteActionPending = false,
  saveState,
  onCancelPendingRewrite,
  onConfirmPendingRewrite,
  onDraftBodyChange,
  onDraftTitleChange,
  onOpenDelete,
  onOpenHistory,
  onOpenRename,
  onOpenMove,
  onPrimaryCreate,
  onSaveDraft,
  onSelectionChange,
}: NotebookEditorPaneProps) {
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (previewMode) {
      onSelectionChange(null);
    }
  }, [onSelectionChange, previewMode]);

  function syncSelection(target: HTMLTextAreaElement) {
    const selectionStart = target.selectionStart ?? 0;
    const selectionEnd = target.selectionEnd ?? selectionStart;
    onSelectionChange({
      start: selectionStart,
      end: selectionEnd,
      text: target.value.slice(selectionStart, selectionEnd),
    });
  }

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden bg-[var(--notebook-panel)]">
      <header className="z-10 flex shrink-0 flex-col gap-4 border-b border-[var(--notebook-border)] bg-[var(--notebook-panel)] px-5 py-4 xl:px-6">
        {!note && !isDraft ? (
          <div className="space-y-1">
            <h2 className="text-[18px] font-semibold text-[var(--notebook-ink)]">
              {copy.noSelectionTitle}
            </h2>
            <p className="text-sm text-[var(--notebook-soft-text)]">
              {copy.noSelectionDescription}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--notebook-soft-text)]">
                  <Folder className="size-3" />
                  <span>{isDraft ? draftSourceLabel : note?.relative_path}</span>
                </div>
                <Input
                  value={draftTitle}
                  onChange={(event) => onDraftTitleChange(event.target.value)}
                  placeholder={copy.noteTitlePlaceholder}
                  className="h-auto border-0 bg-transparent px-0 text-2xl font-semibold leading-tight tracking-tight text-[var(--notebook-ink)] shadow-none focus-visible:ring-0 md:text-[2rem]"
                />
              </div>

              <div className="flex shrink-0 items-center gap-3 self-start lg:pt-1">
                <div className="text-xs text-[var(--notebook-soft-text)]">
                  {isDraft ? (
                    <span>{copy.unsaved}</span>
                  ) : saveState === "saved" ? (
                    <span className="flex items-center text-[var(--notebook-success)]">
                      <CheckCircle2 className="mr-1 size-4" />
                      {copy.saved}
                    </span>
                  ) : saveState === "saving" ? (
                    <span>{copy.saving}</span>
                  ) : (
                    <span>{copy.unsaved}</span>
                  )}
                </div>
                {isDraft ? (
                  <Button
                    className="bg-[var(--notebook-brand)] text-[var(--notebook-panel)] hover:opacity-90"
                    onClick={onSaveDraft}
                  >
                    {copy.saveDraft}
                  </Button>
                ) : (
                  <div className="flex items-center gap-1 border-l border-[var(--notebook-border)] pl-4">
                    <button
                      type="button"
                      onClick={() => setPreviewMode((current) => !current)}
                      className={`rounded-md p-1.5 transition-colors ${previewMode ? "bg-[var(--notebook-active)] text-[var(--notebook-ink)]" : "text-[var(--notebook-soft-text)] hover:bg-[var(--notebook-muted)] hover:text-[var(--notebook-ink)]"}`}
                      title={previewMode ? copy.edit : copy.preview}
                    >
                      {previewMode ? <Edit3 className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={onOpenHistory}
                      className="rounded-md p-1.5 text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-muted)] hover:text-[var(--notebook-ink)]"
                      title={copy.history}
                    >
                      <History className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onOpenDelete}
                      className="rounded-md p-1.5 text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-danger-surface)] hover:text-[var(--notebook-danger)]"
                      title={copy.delete}
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-[var(--notebook-soft-text)] transition-colors hover:bg-[var(--notebook-muted)] hover:text-[var(--notebook-ink)]"
                          title="更多操作"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-36 rounded-xl border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)]"
                      >
                        <DropdownMenuItem onSelect={onOpenRename}>
                          {copy.rename}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onOpenMove}>
                          {copy.move}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </header>

      <div className="relative flex-1 overflow-y-auto px-8 py-6 xl:px-10 xl:py-7">
        {!note && !isDraft || isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-[var(--notebook-soft-text)]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--notebook-muted)]">
              <FileText className="size-6" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-[var(--notebook-ink)]">
              {copy.noSelectionTitle}
            </h3>
            <p className="text-sm">{isLoading ? loadingLabel : copy.noSelectionDescription}</p>
            <button
              type="button"
              onClick={onPrimaryCreate}
              className="mt-6 rounded-md bg-[var(--notebook-brand)] px-4 py-2 text-sm font-medium text-[var(--notebook-panel)] transition-opacity hover:opacity-90"
            >
              {copy.noSelectionCta}
            </button>
          </div>
        ) : (
          <div className="relative mx-auto h-full max-w-[52rem]">
            {pendingRewrite ? (
              <div className="mb-4 rounded-2xl border border-[var(--notebook-warning)]/30 bg-[var(--notebook-warning-surface)] px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--notebook-warning)]">
                      <AlertCircle className="size-4" />
                      <span>待确认改写</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--notebook-soft-text)]">
                      当前正文显示的是改写结果。确认会保留它，取消会回滚到原文。
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)] hover:bg-[var(--notebook-hover)]"
                      onClick={onCancelPendingRewrite}
                      disabled={pendingRewriteActionPending}
                    >
                      <XCircle className="mr-1.5 size-4" />
                      {pendingRewriteActionPending ? "处理中…" : "取消"}
                    </Button>
                    <Button
                      type="button"
                      className="bg-[var(--notebook-brand)] text-[var(--notebook-panel)] hover:opacity-90"
                      onClick={onConfirmPendingRewrite}
                      disabled={pendingRewriteActionPending}
                    >
                      <CheckCircle2 className="mr-1.5 size-4" />
                      {pendingRewriteActionPending ? "处理中…" : "确认"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            {previewMode ? (
              <MarkdownContent
                className="prose prose-neutral max-w-none text-[var(--notebook-ink)]"
                content={draftBody}
                isLoading={false}
                rehypePlugins={[]}
              />
            ) : (
              <Textarea
                value={draftBody}
                onChange={(event) => onDraftBodyChange(event.target.value)}
                onClick={(event) => syncSelection(event.currentTarget)}
                onKeyUp={(event) => syncSelection(event.currentTarget)}
                onSelect={(event) => syncSelection(event.currentTarget)}
                placeholder="开始输入 Markdown..."
                className="h-full min-h-[500px] w-full resize-none border-0 bg-transparent px-0 py-0 text-base leading-[1.8] text-[var(--notebook-ink)] shadow-none focus-visible:ring-0"
              />
            )}

            {!previewMode ? (
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-[var(--notebook-border)] bg-[var(--notebook-panel)] px-4 py-2 opacity-0 shadow-sm transition-opacity duration-300 hover:opacity-100">
                <button className="text-[var(--notebook-soft-text)] transition-colors hover:text-[var(--notebook-ink)]">
                  <FileText className="size-4" />
                </button>
                <div className="h-4 w-px bg-[var(--notebook-border)]" />
                <button className="text-sm font-medium text-[var(--notebook-soft-text)] transition-colors hover:text-[var(--notebook-ink)]">
                  H1
                </button>
                <button className="text-sm font-medium text-[var(--notebook-soft-text)] transition-colors hover:text-[var(--notebook-ink)]">
                  H2
                </button>
                <button className="text-sm font-bold text-[var(--notebook-soft-text)] transition-colors hover:text-[var(--notebook-ink)]">
                  B
                </button>
                <button className="text-sm italic text-[var(--notebook-soft-text)] transition-colors hover:text-[var(--notebook-ink)]">
                  I
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
