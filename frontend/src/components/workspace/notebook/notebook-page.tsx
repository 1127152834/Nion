"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NotebookCreateDialog } from "./notebook-create-dialog";
import { NotebookContextPanel } from "./notebook-context-panel";
import { NotebookDeleteDialog } from "./notebook-delete-dialog";
import { NotebookEditorPane } from "./notebook-editor-pane";
import { buildQuickCaptureDraft } from "./notebook-compose";
import { NotebookFolderPicker } from "./notebook-folder-picker";
import { NotebookQuickCaptureDialog } from "./notebook-quick-capture-dialog";
import { NotebookSidebar } from "./notebook-sidebar";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfNewThread, pathOfNotebookTrash } from "@/core/navigation/desktop-routes";
import {
  buildNotebookDirectoryOptions,
  findDefaultNotebookDirectory,
  useCreateNotebookDirectory,
  useCreateNotebookNote,
  useDeleteNotebookDirectory,
  useDeleteNotebookNote,
  useMoveNotebookNote,
  useNotebookDeletePreview,
  useNotebookHistory,
  useNotebookNotes,
  useNotebookNote,
  useNotebookTree,
  useNotebookTrash,
  useRenameNotebookDirectory,
  useRenameNotebookNote,
  useRestoreNotebookVersion,
  useUpdateNotebookNote,
} from "@/core/notebook";
import { buildNotebookTree } from "@/core/notebook";
import { buildNotebookAssistPrompt, type NotebookAssistAction } from "@/core/notebook";
import { NotebookFolderDialog } from "./notebook-folder-dialog";
type CreateDraft = {
  directory: string;
  title: string;
  body: string;
};

type NotebookContextTab = "ask" | "history" | "info";
type FolderDialogMode = "create" | "rename" | "delete";
type FolderDialogState = {
  mode: FolderDialogMode;
  directory: string;
  name: string;
  open: boolean;
  parentDirectory: string;
};

const notebookThemeStyle = {
  "--notebook-shell": "color-mix(in oklab, var(--background) 84%, var(--muted) 16%)",
  "--notebook-sidebar": "color-mix(in oklab, var(--sidebar) 90%, var(--card) 10%)",
  "--notebook-panel": "color-mix(in oklab, var(--card) 97%, white 3%)",
  "--notebook-muted": "color-mix(in oklab, var(--muted) 88%, var(--card) 12%)",
  "--notebook-hover": "color-mix(in oklab, var(--accent) 78%, var(--card) 22%)",
  "--notebook-active": "color-mix(in oklab, var(--accent) 70%, var(--foreground) 4%)",
  "--notebook-border": "color-mix(in oklab, var(--border) 86%, var(--foreground) 14%)",
  "--notebook-ink": "color-mix(in oklab, var(--foreground) 96%, var(--background) 4%)",
  "--notebook-soft-text": "color-mix(in oklab, var(--muted-foreground) 88%, var(--foreground) 12%)",
  "--notebook-brand": "color-mix(in oklab, var(--foreground) 90%, var(--background) 10%)",
  "--notebook-success": "oklch(0.72 0.15 154)",
  "--notebook-danger": "color-mix(in oklab, var(--destructive) 78%, var(--foreground) 22%)",
  "--notebook-danger-surface":
    "color-mix(in oklab, var(--destructive) 10%, var(--card) 90%)",
  "--notebook-warning": "oklch(0.58 0.14 72)",
  "--notebook-warning-surface": "oklch(0.96 0.03 94)",
} as CSSProperties;

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
  const [savedTitle, setSavedTitle] = useState("");
  const [savedBody, setSavedBody] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "unsaved" | "saving">("saved");
  const [renameValue, setRenameValue] = useState("");
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
  const [moveDirectory, setMoveDirectory] = useState("");
  const [contextTab, setContextTab] = useState<NotebookContextTab>("ask");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [folderDialog, setFolderDialog] = useState<FolderDialogState>({
    mode: "create",
    directory: "",
    name: "",
    open: false,
    parentDirectory: "",
  });

  const { notes: noteSummaries } = useNotebookNotes();
  const { note, isLoading: noteLoading } = useNotebookNote(selectedNoteId);
  const { entries } = useNotebookHistory(selectedNoteId);
  const { preview } = useNotebookDeletePreview(selectedNoteId);
  const { notes: deletedNotes } = useNotebookTrash();

  const createDirectory = useCreateNotebookDirectory();
  const createNote = useCreateNotebookNote();
  const deleteDirectory = useDeleteNotebookDirectory();
  const renameDirectory = useRenameNotebookDirectory();
  const updateNote = useUpdateNotebookNote(selectedNoteId ?? "");
  const renameNote = useRenameNotebookNote(selectedNoteId ?? "");
  const moveNote = useMoveNotebookNote(selectedNoteId ?? "");
  const restoreVersion = useRestoreNotebookVersion(selectedNoteId ?? "");
  const deleteNote = useDeleteNotebookNote(selectedNoteId ?? "");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setSavedTitle(note.title);
    setSavedBody(note.body);
    setSaveState("saved");
    setRenameValue(note.title);
    const slash = note.relative_path.lastIndexOf("/");
    setMoveDirectory(slash >= 0 ? note.relative_path.slice(0, slash) : "");
  }, [note, selectedNoteId]);

  const selectedFile = useMemo(
    () => tree.files.find((file) => file.note_id === selectedNoteId) ?? null,
    [selectedNoteId, tree.files],
  );
  const treeNodes = useMemo(() => buildNotebookTree(tree), [tree]);
  const recentNotes = useMemo(() => noteSummaries, [noteSummaries]);
  const directoryOptions = useMemo(
    () =>
      buildNotebookDirectoryOptions({
        entries: tree.directories,
        inboxLabel: copy.inboxLabel,
        rootLabel: copy.rootFolderLabel,
      }),
    [copy.inboxLabel, copy.rootFolderLabel, tree.directories],
  );

  const dirty = note !== null && (draftBody !== savedBody || draftTitle !== savedTitle);

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
      setSaveState("saving");
      const updated = await updateNote.mutateAsync({
        body: draftBody,
        title: draftTitle,
        expected_content_hash: draftHash,
      });
      setDraftHash(updated.content_hash);
      setSavedTitle(updated.title);
      setSavedBody(updated.body);
      setSaveState("saved");
    } catch (err) {
      setSaveState("unsaved");
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
      await moveNote.mutateAsync({ directory: moveDirectory.trim() });
      setMoveOpen(false);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleFolderDialogSubmit() {
    try {
      if (folderDialog.mode === "create") {
        await createDirectory.mutateAsync({
          parent_directory: folderDialog.parentDirectory,
          name: folderDialog.name.trim(),
        });
      } else if (folderDialog.mode === "rename") {
        await renameDirectory.mutateAsync({
          directory: folderDialog.directory,
          name: folderDialog.name.trim(),
        });
      } else {
        await deleteDirectory.mutateAsync({
          directory: folderDialog.directory,
        });
      }
      setFolderDialog({
        mode: "create",
        directory: "",
        name: "",
        open: false,
        parentDirectory: "",
      });
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

  function syncNotebookDraft(nextNote: { title: string; body: string; content_hash: string }) {
    setDraftTitle(nextNote.title);
    setDraftBody(nextNote.body);
    setDraftHash(nextNote.content_hash);
    setSavedTitle(nextNote.title);
    setSavedBody(nextNote.body);
    setSaveState("saved");
  }

  useEffect(() => {
    if (!note) {
      return;
    }
    if (!dirty) {
      return;
    }
    setSaveState("unsaved");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      void handleSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [draftBody, draftTitle, dirty, note]);

  useEffect(() => {
    if (!createOpen) {
      return;
    }
    setCreateDraft((current) => ({
      ...current,
      directory: findDefaultNotebookDirectory({
        options: directoryOptions,
        preferredDirectory: current.directory,
        selectedNotePath: selectedFile?.path ?? null,
      }),
    }));
  }, [createOpen, directoryOptions, selectedFile?.path]);

  useEffect(() => {
    if (!moveOpen) {
      return;
    }
    setMoveDirectory((current) =>
      findDefaultNotebookDirectory({
        options: directoryOptions,
        preferredDirectory: current,
        selectedNotePath: selectedFile?.path ?? null,
      }),
    );
  }, [directoryOptions, moveOpen, selectedFile?.path]);

  function openCreateDialogInDirectory(directory: string) {
    setCreateDraft((current) => ({ ...current, directory }));
    setCreateOpen(true);
  }

  function openCreateFolderDialog(parentDirectory = "") {
    setFolderDialog({
      mode: "create",
      directory: "",
      name: "",
      open: true,
      parentDirectory,
    });
  }

  function openRenameFolderDialog(directory: string) {
    const segments = directory.split("/").filter(Boolean);
    setFolderDialog({
      mode: "rename",
      directory,
      name: segments.at(-1) ?? "",
      open: true,
      parentDirectory: "",
    });
  }

  function openDeleteFolderDialog(directory: string) {
    setFolderDialog({
      mode: "delete",
      directory,
      name: "",
      open: true,
      parentDirectory: "",
    });
  }

  const folderDialogParentLabel = useMemo(() => {
    if (!folderDialog.parentDirectory) {
      return copy.rootFolderLabel;
    }
    return folderDialog.parentDirectory.split("/").join(" / ");
  }, [copy.rootFolderLabel, folderDialog.parentDirectory]);

  const folderDialogTargetLabel = useMemo(() => {
    if (!folderDialog.directory) {
      return copy.rootFolderLabel;
    }
    return folderDialog.directory.split("/").join(" / ");
  }, [copy.rootFolderLabel, folderDialog.directory]);

  return (
    <>
      <section
        className="flex h-full min-h-0 flex-1 flex-col bg-[var(--notebook-shell)] text-[var(--notebook-ink)]"
        style={notebookThemeStyle}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {error ? (
            <div className="mx-4 mt-4 rounded-2xl border border-[color-mix(in_oklab,var(--notebook-danger)_22%,transparent)] bg-[var(--notebook-danger-surface)] px-4 py-3 text-sm text-[var(--notebook-danger)]">
              {error instanceof Error ? error.message : String(error)}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-[15.5rem_minmax(0,1fr)_19.5rem] overflow-hidden bg-[var(--notebook-panel)]">
            <NotebookSidebar
              activePath={selectedFile?.path ?? null}
              copy={{
                createFolder: copy.createFolder,
                createNote: copy.createNote,
                createNoteHere: copy.createNoteHere,
                createSubfolder: copy.createSubfolder,
                deleteFolder: copy.deleteFolder,
                emptyDescription: copy.emptyDescription,
                emptyTitle: copy.emptyTitle,
                noteListDescription: copy.noteListDescription,
                noteListTitle: copy.noteListTitle,
                quickCaptureLabel: copy.quickCapture,
                recentTitle: copy.recentTitle,
                renameFolder: copy.renameFolder,
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
              onOpenCreateFolder={() => openCreateFolderDialog("")}
              onOpenCreateInDirectory={openCreateDialogInDirectory}
              onOpenCreateSubfolder={openCreateFolderDialog}
              onOpenDeleteDirectory={openDeleteFolderDialog}
              onOpenQuickCapture={() => setQuickCaptureOpen(true)}
              onOpenRenameDirectory={openRenameFolderDialog}
              onQueryChange={setQuery}
              onOpenTrash={() => router.push(pathOfNotebookTrash())}
              onSelectNote={setSelectedNoteId}
            />

            <NotebookEditorPane
              copy={{
                delete: copy.delete,
                edit: copy.edit,
                history: copy.history,
                lastEditedPrefix: "最后编辑于",
                noSelectionCta: copy.createNote,
                noSelectionDescription: copy.noSelectionDescription,
                noSelectionTitle: copy.noSelectionTitle,
                noteTitlePlaceholder: copy.noteTitlePlaceholder,
                preview: copy.preview,
                saved: copy.saved,
                saving: copy.saving,
                selectNote: copy.selectNote,
                unsaved: copy.unsaved,
              }}
              draftBody={draftBody}
              draftTitle={draftTitle}
              isLoading={noteLoading}
              loadingLabel={t.common.loading}
              note={note}
              saveState={saveState}
              onDraftBodyChange={setDraftBody}
              onDraftTitleChange={setDraftTitle}
              onOpenDelete={() => setDeleteOpen(true)}
              onOpenHistory={() => setContextTab("history")}
              onOpenMore={() => setRenameOpen(true)}
              onPrimaryCreate={() => setCreateOpen(true)}
            />

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
              currentContentHash={draftHash}
              entries={entries}
              note={note}
              notePath={selectedFile?.path ?? null}
              noteTitle={draftTitle}
              onActiveTabChange={setContextTab}
              onApplyNote={syncNotebookDraft}
              onStartConversation={handleAssist}
            />
          </div>
        </div>
      </section>

      <NotebookCreateDialog
        body={createDraft.body}
        copy={{
          cancel: t.common.cancel,
          createDialogDescription: copy.createDialogDescription,
          createDialogTitle: copy.createDialogTitle,
          createNote: copy.createNote,
          emptyDescription: copy.emptyDescription,
          folderPickerEmpty: copy.folderPickerEmpty,
          noteTitlePlaceholder: copy.noteTitlePlaceholder,
          saveToLabel: copy.saveToLabel,
          selectFolderPlaceholder: copy.selectFolderPlaceholder,
          saving: copy.saving,
        }}
        directory={createDraft.directory}
        directoryOptions={directoryOptions}
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
        destinationLabel={copy.quickCaptureDestination.replace(
          "{folder}",
          copy.inboxLabel,
        )}
        open={quickCaptureOpen}
        pending={createNote.isPending}
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
        <DialogContent className="border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)]">
          <DialogHeader>
            <DialogTitle>{copy.move}</DialogTitle>
          </DialogHeader>
          <NotebookFolderPicker
            emptyLabel={copy.folderPickerEmpty}
            options={directoryOptions}
            placeholder={copy.selectFolderPlaceholder}
            value={moveDirectory}
            onValueChange={setMoveDirectory}
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

      <NotebookFolderDialog
        copy={{
          cancel: t.common.cancel,
          confirmCreate: copy.confirmCreateFolder,
          confirmDelete: copy.confirmDeleteFolder,
          confirmRename: copy.confirmRenameFolder,
          createFolder: copy.createFolder,
          deleteFolder: copy.deleteFolder,
          deleteFolderDescription: copy.deleteFolderDescription,
          folderNameLabel: copy.folderNameLabel,
          folderNamePlaceholder: copy.folderNamePlaceholder,
          renameFolder: copy.renameFolder,
          rootFolderLabel: copy.rootFolderLabel,
          saveToPrefix: copy.folderSaveToPrefix,
          saving: copy.saving,
        }}
        mode={folderDialog.mode}
        name={folderDialog.name}
        open={folderDialog.open}
        parentLabel={folderDialogParentLabel}
        pending={
          createDirectory.isPending ||
          renameDirectory.isPending ||
          deleteDirectory.isPending
        }
        targetLabel={folderDialogTargetLabel}
        onNameChange={(value) =>
          setFolderDialog((current) => ({ ...current, name: value }))
        }
        onOpenChange={(open) =>
          setFolderDialog((current) => ({ ...current, open }))
        }
        onSubmit={handleFolderDialogSubmit}
      />

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
