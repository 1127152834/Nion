"use client";

import { ClockIcon, RefreshCcwIcon, Trash2Icon, FileTextIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import { useNotebookTrash, useRestoreDeletedNotebookNote } from "@/core/notebook";
import { formatTimeAgo } from "@/core/utils/datetime";

export function NotebookTrashPage() {
  const { t } = useI18n();
  const copy = t.notebookPage;
  const { notes, isLoading, error } = useNotebookTrash();
  const restoreDeleted = useRestoreDeletedNotebookNote("");

  async function handleRestore(noteId: string) {
    try {
      await restoreDeleted.mutateAsync(noteId);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-white">
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-[#E5E5E5] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF1F0] text-[#F5222D]">
            <Trash2Icon className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1A1A1A]">{copy.trashTitle}</h1>
            <p className="text-xs text-[#8C8C8C]">{copy.trashDescription}</p>
          </div>
        </div>
        {notes.length > 0 ? (
          <button
            type="button"
            className="rounded-md bg-[#FFF1F0] px-4 py-2 text-sm font-medium text-[#F5222D] transition-colors hover:bg-[#FFCCC7]"
          >
            清空回收站
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
          {error instanceof Error ? error.message : String(error)}
        </div>
      ) : null}

      <div className="custom-scrollbar flex-1 overflow-y-auto bg-[#F9F9F8] p-6">
        {isLoading ? (
          <div className="text-sm text-[#8C8C8C]">{t.common.loading}</div>
        ) : notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-[#8C8C8C]">
            <Trash2Icon className="mb-4 size-12 text-[#E5E5E5]" />
            <h2 className="mb-2 text-lg font-medium text-[#1A1A1A]">回收站为空</h2>
            <p className="text-sm">{copy.trashEmpty}</p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-4">
            {notes.map((note) => (
              <div
                key={note.note_id}
                className="group flex items-start justify-between rounded-xl border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <div className="mb-1 flex items-center gap-2">
                    <FileTextIcon className="size-4 text-[#8C8C8C]" />
                    <h3 className="truncate text-base font-medium text-[#1A1A1A]">{note.title}</h3>
                  </div>
                  <p className="mb-3 line-clamp-2 text-sm text-[#595959]">{note.summary}</p>
                  <div className="flex items-center gap-4 text-xs text-[#8C8C8C]">
                    <span className="flex items-center">
                      <ClockIcon className="mr-1 size-3" />
                      删除于 {note.deleted_at ? formatTimeAgo(note.deleted_at) : ""}
                    </span>
                    <span>原路径: {note.relative_path}</span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestore(note.note_id)}
                    className="flex items-center gap-1 rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#F0F0F0]"
                  >
                    <RefreshCcwIcon className="size-4" />
                    <span>{copy.restoreDeleted}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
