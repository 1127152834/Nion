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
import { Textarea } from "@/components/ui/textarea";
import { NotebookCreateDialog } from "./notebook-create-dialog";
import { NotebookContextPanel } from "./notebook-context-panel";
import { NotebookDeleteDialog } from "./notebook-delete-dialog";
import { NotebookEditorPane } from "./notebook-editor-pane";
import { buildQuickCaptureDraft } from "./notebook-compose";
import { NotebookQuickCaptureDialog } from "./notebook-quick-capture-dialog";
import { NotebookSidebar } from "./notebook-sidebar";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfNewThread, pathOfNotebookTrash } from "@/core/navigation/desktop-routes";
import {
  useCreateNotebookNote,
  useDeleteNotebookNote,
  useMoveNotebookNote,
  useNotebookDeletePreview,
  useNotebookHistory,
  useNotebookNotes,
  useNotebookNote,
  useNotebookTree,
  useNotebookTrash,
  useRenameNotebookNote,
  useRestoreNotebookVersion,
  useUpdateNotebookNote,
} from "@/core/notebook";
import { buildNotebookTree } from "@/core/notebook";
import { buildNotebookAssistPrompt, type NotebookAssistAction } from "@/core/notebook";
type CreateDraft = {
  directory: string;
  title: string;
  body: string;
};

type NotebookContextTab = "ask" | "history" | "info";

export function NotebookPage() {
  const { t } = useI18n();
  const copy = t.notebookPage;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tree, isLoading, error } = useNotebookTree();
  const [query, setQuery] = useState("");
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
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [quickCaptureValue, setQuickCaptureValue] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [contextTab, setContextTab] = useState<NotebookContextTab>("ask");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { notes: noteSummaries } = useNotebookNotes();
  const { note, isLoading: noteLoading } = useNotebookNote(selectedNoteId);
  const { entries } = useNotebookHistory(selectedNoteId);
  const { preview } = useNotebookDeletePreview(selectedNoteId);
  const { notes: deletedNotes } = useNotebookTrash();

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
  const recentNotes = useMemo(() => noteSummaries, [noteSummaries]);

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

  async function handleQuickCapture() {
    try {
      const draft = buildQuickCaptureDraft(quickCaptureValue);
      const created = await createNote.mutateAsync(draft);
      setQuickCaptureOpen(false);
      setQuickCaptureValue("");
      setSelectedNoteId(created.note_id);
      toast.success(copy.quickCaptureSaved);
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
              copy={{
                createNote: copy.createNote,
                emptyDescription: copy.emptyDescription,
                emptyTitle: copy.emptyTitle,
                noteListDescription: copy.noteListDescription,
                noteListTitle: copy.noteListTitle,
                quickCaptureLabel: copy.quickCapture,
                recentTitle: copy.recentTitle,
                searchPlaceholder: copy.searchPlaceholder,
                trashTitle: copy.trashTitle,
              }}
              deletedCount={deletedNotes.length}
              isLoading={isLoading}
              loadingLabel={t.common.loading}
              noteSummaries={noteSummaries}
              query={query}
              recentNotes={recentNotes}
              treeFileCount={tree.files.length}
              treeNodes={treeNodes}
              onOpenCreate={() => setCreateOpen(true)}
              onOpenQuickCapture={() => setQuickCaptureOpen(true)}
              onQueryChange={setQuery}
              onOpenTrash={() => router.push(pathOfNotebookTrash())}
              onSelectNote={setSelectedNoteId}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={52} minSize={36}>
            <NotebookEditorPane
              copy={{
                delete: copy.delete,
                history: copy.history,
                move: copy.move,
                noSelectionDescription: copy.noSelectionDescription,
                noSelectionTitle: copy.noSelectionTitle,
                noteTitlePlaceholder: copy.noteTitlePlaceholder,
                preview: copy.preview,
                rename: copy.rename,
                save: copy.save,
                saved: copy.saved,
                saving: copy.saving,
                selectNote: copy.selectNote,
                unsaved: copy.unsaved,
                edit: copy.edit,
              }}
              dirty={dirty}
              draftBody={draftBody}
              draftTitle={draftTitle}
              isLoading={noteLoading}
              loadingLabel={t.common.loading}
              note={note}
              onDraftBodyChange={setDraftBody}
              onDraftTitleChange={setDraftTitle}
              onOpenDelete={() => setDeleteOpen(true)}
              onOpenHistory={() => setContextTab("history")}
              onOpenMove={() => setMoveOpen(true)}
              onOpenRename={() => setRenameOpen(true)}
              onSave={handleSave}
              savePending={updateNote.isPending}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={24} minSize={18}>
            <NotebookContextPanel
              activeTab={contextTab}
              copy={{
                askTab: copy.askTab,
                assistActionItems: copy.assistActionItems,
                assistChecklist: copy.assistChecklist,
                assistDescription: copy.assistDescription,
                assistExpand: copy.assistExpand,
                assistRewrite: copy.assistRewrite,
                assistSummarize: copy.assistSummarize,
                assistTitle: copy.assistTitle,
                historyTab: copy.historyTab,
                historyTitle: copy.historyTitle,
                infoContentHash: copy.infoContentHash,
                infoCreatedAt: copy.infoCreatedAt,
                infoNoteId: copy.infoNoteId,
                infoPath: copy.infoPath,
                infoTab: copy.infoTab,
                infoUpdatedAt: copy.infoUpdatedAt,
                noSelectionDescription: copy.noSelectionDescription,
                restore: copy.restore,
                selectNote: copy.selectNote,
              }}
              entries={entries}
              note={note}
              notePath={selectedFile?.path ?? null}
              noteTitle={draftTitle}
              onActiveTabChange={setContextTab}
              onAssist={handleAssist}
              onRestoreVersion={handleRestore}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>

      <NotebookCreateDialog
        body={createDraft.body}
        copy={{
          cancel: t.common.cancel,
          createDialogDescription: copy.createDialogDescription,
          createDialogTitle: copy.createDialogTitle,
          createNote: copy.createNote,
          emptyDescription: copy.emptyDescription,
          noteDirectoryPlaceholder: copy.noteDirectoryPlaceholder,
          noteTitlePlaceholder: copy.noteTitlePlaceholder,
          saving: copy.saving,
        }}
        directory={createDraft.directory}
        open={createOpen}
        pending={createNote.isPending}
        title={createDraft.title}
        onBodyChange={(value) =>
          setCreateDraft((current) => ({ ...current, body: value }))
        }
        onDirectoryChange={(value) =>
          setCreateDraft((current) => ({ ...current, directory: value }))
        }
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        onTitleChange={(value) =>
          setCreateDraft((current) => ({ ...current, title: value }))
        }
      />

      <NotebookQuickCaptureDialog
        cancelLabel={t.common.cancel}
        open={quickCaptureOpen}
        pending={createNote.isPending}
        quickCaptureDescription={copy.quickCaptureDescription}
        quickCaptureHint={copy.quickCaptureHint}
        quickCaptureLabel={copy.quickCapture}
        saveLabel={copy.createNote}
        savingLabel={copy.saving}
        value={quickCaptureValue}
        onOpenChange={setQuickCaptureOpen}
        onSubmit={handleQuickCapture}
        onValueChange={setQuickCaptureValue}
      />

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

      <NotebookDeleteDialog
        cancelLabel={t.common.cancel}
        confirmLabel={copy.deleteConfirmAction}
        description={
          preview
            ? copy.deleteConfirmDescription.replace("{title}", preview.title)
            : copy.deleteConfirmDescription.replace("{title}", "")
        }
        open={deleteOpen}
        summary={preview?.summary ?? null}
        title={copy.deleteConfirmTitle}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
