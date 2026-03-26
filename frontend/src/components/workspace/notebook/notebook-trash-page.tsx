"use client";

import { ArrowLeftIcon, RotateCcwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfNotebook } from "@/core/navigation/desktop-routes";
import { useNotebookTrash, useRestoreDeletedNotebookNote } from "@/core/notebook";
import { formatTimeAgo } from "@/core/utils/datetime";

export function NotebookTrashPage() {
  const { t } = useI18n();
  const copy = t.notebookPage;
  const router = useRouter();
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
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-2xl font-semibold tracking-tight">{copy.trashTitle}</div>
          <p className="text-muted-foreground text-sm">{copy.trashDescription}</p>
        </div>
        <Button variant="outline" onClick={() => router.push(pathOfNotebook())}>
          <ArrowLeftIcon className="size-4" />
          {copy.title}
        </Button>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
          {error instanceof Error ? error.message : String(error)}
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : notes.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
          {copy.trashEmpty}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.note_id} className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle>{note.title}</CardTitle>
                <CardDescription>{note.relative_path}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-4">
                <p className="text-sm leading-6">{note.summary}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground text-xs">
                    {note.deleted_at ? formatTimeAgo(note.deleted_at) : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(note.note_id)}
                  >
                    <RotateCcwIcon className="size-4" />
                    {copy.restoreDeleted}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
