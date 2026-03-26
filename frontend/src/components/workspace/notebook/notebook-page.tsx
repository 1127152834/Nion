"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmActionDialog } from "@/components/workspace/settings/confirm-action-dialog";
import { NotebookContextPanel } from "./notebook-context-panel";
import { NotebookEditorPane } from "./notebook-editor-pane";
import { NotebookSidebar } from "./notebook-sidebar";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfNewThread, pathOfNotebookTrash } from "@/core/navigation/desktop-routes";
import {
  useCreateNotebookNote,
  useDeleteNotebookNote,
  useMoveNotebookNote,
  useNotebookDeletePreview,
  useNotebookHistory,
  useNotebookNote,
  useNotebookTree,
  useRenameNotebookNote,
  useRestoreNotebookVersion,
  useUpdateNotebookNote,
} from "@/core/notebook";
import { buildNotebookTree } from "@/core/notebook";
import { buildNotebookAssistPrompt, type NotebookAssistAction } from "@/core/notebook";
import { formatTimeAgo } from "@/core/utils/datetime";

type CreateDraft = {
  directory: string;
  title: string;
  body: string;
};

export function NotebookPage() {
  const { t } = useI18n();
  const copy = t.notebookPage;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tree, isLoading, error } = useNotebookTree();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftHash, setDraftHash] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [moveValue, setMoveValue] = useState("");
  const [createDraft, setCreateDraft] = useState<CreateDraft>({
    directory: "",
    title: "",
    body: "",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { note, isLoading: noteLoading } = useNotebookNote(selectedNoteId);
  const { entries } = useNotebookHistory(historyOpen ? selectedNoteId : null);
  const { preview } = useNotebookDeletePreview(selectedNoteId);

  const createNote = useCreateNotebookNote();
  const updateNote = useUpdateNotebookNote(selectedNoteId ?? "");
  const renameNote = useRenameNotebookNote(selectedNoteId ?? "");
  const moveNote = useMoveNotebookNote(selectedNoteId ?? "");
  const restoreVersion = useRestoreNotebookVersion(selectedNoteId ?? "");
  const deleteNote = useDeleteNotebookNote(selectedNoteId ?? "");

  useEffect(() => {
    if (!selectedNoteId && tree.files.length > 0) {
      setSelectedNoteId(tree.files[0]?.note_id ?? null);
    }
  }, [selectedNoteId, tree.files]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") {
      return;
    }
    const seededTitle = searchParams.get("title") ?? "";
    const seededBody = searchParams.get("body") ?? "";
    const seededDirectory = searchParams.get("directory") ?? "";
    setCreateDraft({
      title: seededTitle,
      body: seededBody,
      directory: seededDirectory,
    });
    setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedNoteId || !note) {
      return;
    }
    setDraftTitle(note.title);
    setDraftBody(note.body);
    setDraftHash(note.content_hash);
    setRenameValue(note.title);
    const slash = note.relative_path.lastIndexOf("/");
    setMoveValue(slash >= 0 ? note.relative_path.slice(0, slash) : "");
  }, [note, selectedNoteId]);

  const selectedFile = useMemo(
    () => tree.files.find((file) => file.note_id === selectedNoteId) ?? null,
    [selectedNoteId, tree.files],
  );
  const treeNodes = useMemo(() => buildNotebookTree(tree), [tree]);

  const dirty =
    note !== null && (draftBody !== note.body || draftTitle !== note.title);

  async function handleCreate() {
    try {
      const created = await createNote.mutateAsync(createDraft);
      setCreateOpen(false);
      setCreateDraft({ directory: "", title: "", body: "" });
      setSelectedNoteId(created.note_id);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSave() {
    if (!selectedNoteId) {
      return;
    }
    try {
      const updated = await updateNote.mutateAsync({
        body: draftBody,
        title: draftTitle,
        expected_content_hash: draftHash,
      });
      setDraftHash(updated.content_hash);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRename() {
    try {
      const renamed = await renameNote.mutateAsync({ title: renameValue.trim() });
      setRenameOpen(false);
      setDraftTitle(renamed.title);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleMove() {
    try {
      await moveNote.mutateAsync({ directory: moveValue.trim() });
      setMoveOpen(false);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRestore(versionId: string) {
    try {
      const restored = await restoreVersion.mutateAsync({ version_id: versionId });
      setDraftBody(restored.body);
      setDraftTitle(restored.title);
      setDraftHash(restored.content_hash);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteNote.mutateAsync();
      setSelectedNoteId(null);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function handleAssist(action: NotebookAssistAction) {
    if (!note) {
      return;
    }
    router.push(
      pathOfNewThread({
        draft: buildNotebookAssistPrompt(note, action),
      }),
    );
  }

  return (
    <>
      <section className="space-y-6">
        <header className="space-y-2">
          <div className="text-2xl font-semibold tracking-tight">{copy.title}</div>
          <p className="text-muted-foreground max-w-3xl text-sm">
            {copy.description}
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
            {error instanceof Error ? error.message : String(error)}
          </div>
        ) : null}

        <ResizablePanelGroup
          orientation="horizontal"
          className="min-h-[70vh] overflow-hidden rounded-xl border"
        >
          <ResizablePanel defaultSize={24} minSize={18}>
            <NotebookSidebar
              activePath={selectedFile?.path ?? null}
              copy={copy}
              isLoading={isLoading}
              loadingLabel={t.common.loading}
              treeFileCount={tree.files.length}
              treeNodes={treeNodes}
              onOpenCreate={() => setCreateOpen(true)}
              onOpenTrash={() => router.push(pathOfNotebookTrash())}
              onSelectNote={setSelectedNoteId}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={52} minSize={36}>
            <NotebookEditorPane
              copy={copy}
              dirty={dirty}
              draftBody={draftBody}
              draftTitle={draftTitle}
              isLoading={noteLoading}
              loadingLabel={t.common.loading}
              note={note}
              onDraftBodyChange={setDraftBody}
              onDraftTitleChange={setDraftTitle}
              onOpenDelete={() => setDeleteOpen(true)}
              onOpenHistory={() => setHistoryOpen(true)}
              onOpenMove={() => setMoveOpen(true)}
              onOpenRename={() => setRenameOpen(true)}
              onSave={handleSave}
              savePending={updateNote.isPending}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={24} minSize={18}>
            <NotebookContextPanel
              copy={copy}
              note={note}
              notePath={selectedFile?.path ?? null}
              noteTitle={draftTitle}
              onAssist={handleAssist}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.createDialogTitle}</DialogTitle>
            <DialogDescription>{copy.createDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={createDraft.title}
              onChange={(event) =>
                setCreateDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder={copy.noteTitlePlaceholder}
            />
            <Input
              value={createDraft.directory}
              onChange={(event) =>
                setCreateDraft((current) => ({ ...current, directory: event.target.value }))
              }
              placeholder={copy.noteDirectoryPlaceholder}
            />
            <Textarea
              value={createDraft.body}
              onChange={(event) =>
                setCreateDraft((current) => ({ ...current, body: event.target.value }))
              }
              placeholder={copy.emptyDescription}
              className="min-h-40"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createDraft.title.trim() || createNote.isPending}
            >
              {createNote.isPending ? copy.saving : copy.createNote}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.rename}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            placeholder={copy.renamePlaceholder}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim() || renameNote.isPending}>
              {copy.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.move}</DialogTitle>
          </DialogHeader>
          <Input
            value={moveValue}
            onChange={(event) => setMoveValue(event.target.value)}
            placeholder={copy.movePlaceholder}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleMove} disabled={moveNote.isPending}>
              {copy.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{copy.historyTitle}</SheetTitle>
            <SheetDescription>{copy.historyDescription}</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-4 pb-4">
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card key={entry.version_id} className="gap-3 py-4">
                  <CardContent className="space-y-2 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{entry.operation}</Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatTimeAgo(entry.timestamp)}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {entry.actor_type} · {entry.path_at_time}
                    </div>
                    {entry.diff_text ? (
                      <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs leading-5 whitespace-pre-wrap">
                        {entry.diff_text}
                      </pre>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(entry.version_id)}
                    >
                      {copy.restore}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={copy.deleteConfirmTitle}
        description={
          preview
            ? copy.deleteConfirmDescription.replace("{title}", preview.title)
            : copy.deleteConfirmDescription.replace("{title}", "")
        }
        confirmText={copy.deleteConfirmAction}
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
