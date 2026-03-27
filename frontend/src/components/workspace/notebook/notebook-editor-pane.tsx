"use client";

import { CheckCircle2, Clock, Edit3, Eye, FileText, Folder, History, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NotebookNote } from "@/core/notebook";

import { MarkdownContent } from "../messages/markdown-content";

type NotebookEditorPaneCopy = {
  delete: string;
  edit: string;
  history: string;
  lastEditedPrefix: string;
  noSelectionCta: string;
  noSelectionDescription: string;
  noSelectionTitle: string;
  noteTitlePlaceholder: string;
  preview: string;
  saved: string;
  saving: string;
  selectNote: string;
  unsaved: string;
};

type NotebookEditorPaneProps = {
  copy: NotebookEditorPaneCopy;
  draftBody: string;
  draftTitle: string;
  isLoading: boolean;
  loadingLabel: string;
  note: NotebookNote | null;
  saveState: "saved" | "unsaved" | "saving";
  onDraftBodyChange: (value: string) => void;
  onDraftTitleChange: (value: string) => void;
  onOpenDelete: () => void;
  onOpenHistory: () => void;
  onOpenMore: () => void;
  onPrimaryCreate: () => void;
};

export function NotebookEditorPane({
  copy,
  draftBody,
  draftTitle,
  isLoading,
  loadingLabel,
  note,
  saveState,
  onDraftBodyChange,
  onDraftTitleChange,
  onOpenDelete,
  onOpenHistory,
  onOpenMore,
  onPrimaryCreate,
}: NotebookEditorPaneProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const lastEdited = note ? formatLastEdited(note.updated_at) : "";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-white">
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-[#E5E5E5] bg-white px-6 py-4">
        {!note ? (
          <div className="space-y-1">
            <h2 className="text-[18px] font-semibold text-[#1A1A1A]">
              {copy.noSelectionTitle}
            </h2>
            <p className="text-sm text-[#8C8C8C]">{copy.noSelectionDescription}</p>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 flex-col">
              <div className="mb-1 flex items-center gap-2 text-xs text-[#8C8C8C]">
                <Folder className="size-3" />
                <span>{note.relative_path}</span>
                <span>/</span>
                <span className="flex items-center">
                  <Clock className="mr-1 size-3" />
                  {copy.lastEditedPrefix} {lastEdited}
                </span>
              </div>
              <Input
                value={draftTitle}
                onChange={(event) => onDraftTitleChange(event.target.value)}
                placeholder={copy.noteTitlePlaceholder}
                className="h-auto border-0 bg-transparent px-0 text-[36px] font-semibold tracking-tight text-[#1A1A1A] shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-xs text-[#8C8C8C]">
                {saveState === "saved" ? (
                  <span className="flex items-center text-[#52C41A]">
                    <CheckCircle2 className="mr-1 size-4" />
                    {copy.saved}
                  </span>
                ) : saveState === "saving" ? (
                  <span>{copy.saving}</span>
                ) : (
                  <span>{copy.unsaved}</span>
                )}
              </div>
              <div className="flex items-center gap-1 border-l border-[#E5E5E5] pl-4">
                <button
                  type="button"
                  onClick={() => setPreviewMode((current) => !current)}
                  className={`rounded-md p-1.5 transition-colors ${previewMode ? "bg-[#EAEAE9] text-[#1A1A1A]" : "text-[#8C8C8C] hover:bg-[#F0F0F0] hover:text-[#1A1A1A]"}`}
                  title={previewMode ? copy.edit : copy.preview}
                >
                  {previewMode ? <Edit3 className="size-4" /> : <Eye className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="rounded-md p-1.5 text-[#8C8C8C] transition-colors hover:bg-[#F0F0F0] hover:text-[#1A1A1A]"
                  title={copy.history}
                >
                  <History className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenDelete}
                  className="rounded-md p-1.5 text-[#8C8C8C] transition-colors hover:bg-[#FFF1F0] hover:text-[#F5222D]"
                  title={copy.delete}
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenMore}
                  className="rounded-md p-1.5 text-[#8C8C8C] transition-colors hover:bg-[#F0F0F0] hover:text-[#1A1A1A]"
                  title="更多操作"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      <div className="relative flex-1 overflow-y-auto px-12 py-8">
        {!note || isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-[#8C8C8C]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0F0F0]">
              <FileText className="size-6" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-[#1A1A1A]">
              {copy.noSelectionTitle}
            </h3>
            <p className="text-sm">{isLoading ? loadingLabel : copy.noSelectionDescription}</p>
            <button
              type="button"
              onClick={onPrimaryCreate}
              className="mt-6 rounded-md bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333333]"
            >
              {copy.noSelectionCta}
            </button>
          </div>
        ) : (
          <div className="relative mx-auto h-full max-w-3xl">
            {previewMode ? (
              <MarkdownContent
                className="prose prose-neutral max-w-none"
                content={draftBody}
                isLoading={false}
                rehypePlugins={[]}
              />
            ) : (
              <Textarea
                value={draftBody}
                onChange={(event) => onDraftBodyChange(event.target.value)}
                placeholder="开始输入 Markdown..."
                className="min-h-[500px] h-full w-full resize-none border-0 bg-transparent px-0 py-0 text-base leading-relaxed text-[#1A1A1A] shadow-none focus-visible:ring-0"
              />
            )}

            {!previewMode ? (
              <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-4 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 shadow-sm hover:flex">
                <button className="text-[#8C8C8C] transition-colors hover:text-[#1A1A1A]">
                  <FileText className="size-4" />
                </button>
                <div className="h-4 w-px bg-[#E5E5E5]" />
                <button className="text-sm font-medium text-[#8C8C8C] transition-colors hover:text-[#1A1A1A]">
                  H1
                </button>
                <button className="text-sm font-medium text-[#8C8C8C] transition-colors hover:text-[#1A1A1A]">
                  H2
                </button>
                <button className="text-sm font-bold text-[#8C8C8C] transition-colors hover:text-[#1A1A1A]">
                  B
                </button>
                <button className="text-sm italic text-[#8C8C8C] transition-colors hover:text-[#1A1A1A]">
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

function formatLastEdited(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
