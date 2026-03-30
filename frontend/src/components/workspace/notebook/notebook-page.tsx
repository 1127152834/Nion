"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfNotebookTrash } from "@/core/navigation/desktop-routes";
import {
  buildNotebookDirectoryOptions,
  buildNotebookTree,
  findDefaultNotebookDirectory,
  type NotebookAssistAction,
  type NotebookSelection,
  useCreateNotebookDirectory,
  useCreateNotebookNote,
  useDeleteNotebookDirectory,
  useDeleteNotebookNote,
  useMoveNotebookDirectory,
  useMoveNotebookNote,
  useMoveNotebookNoteAction,
  useNotebookDeletePreview,
  useNotebookHistory,
  useNotebookNotes,
  useNotebookNote,
  useNotebookTree,
  useNotebookTrash,
  useRenameNotebookDirectory,
  useRenameNotebookNote,
  useUpdateNotebookNote,
} from "@/core/notebook";

import { buildQuickCaptureDraft } from "./notebook-compose";
import { NotebookContextPanel } from "./notebook-context-panel";
import { NotebookCreateDialog } from "./notebook-create-dialog";
import { NotebookDeleteDialog } from "./notebook-delete-dialog";
import { NotebookDialogShell } from "./notebook-dialog-shell";
import { NotebookEditorPane } from "./notebook-editor-pane";
import { NotebookFolderDialog } from "./notebook-folder-dialog";
import { NotebookFolderPicker } from "./notebook-folder-picker";
import { NotebookQuickCaptureDialog } from "./notebook-quick-capture-dialog";
import { NotebookSidebar } from "./notebook-sidebar";
import { notebookThemeStyle } from "./notebook-theme";

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
type DraftSession = {
  directory: string;
  needsMetadataBeforeSave: boolean;
};

type NotebookConversationStartInput = {
  action: NotebookAssistAction;
  mode?: "note" | "selection" | "preview";
  previewContent?: string;
};

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
  const [draftSession, setDraftSession] = useState<DraftSession | null>(null);
  const [editorSelection, setEditorSelection] = useState<NotebookSelection | null>(null);
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);
  const [contextTab, setContextTab] = useState<NotebookContextTab>("ask");
  const [notebookAssistantSessionId, setNotebookAssistantSessionId] = useState<string | null>(null);
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
  const moveAnyDirectory = useMoveNotebookDirectory();
  const updateNote = useUpdateNotebookNote(selectedNoteId ?? "");
  const renameNote = useRenameNotebookNote(selectedNoteId ?? "");
  const moveAnyNote = useMoveNotebookNoteAction();
  const moveNote = useMoveNotebookNote(selectedNoteId ?? "");
  const deleteNote = useDeleteNotebookNote(selectedNoteId ?? "");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (draftSession) {
      return;
    }
    if (!selectedNoteId && tree.files.length > 0) {
      setSelectedNoteId(tree.files[0]?.note_id ?? null);
    }
  }, [draftSession, selectedNoteId, tree.files]);

  useEffect(() => {
    if (searchParams.get("create") !== "1") {
      return;
    }
    const seededTitle = searchParams.get("title") ?? "";
    const seededBody = searchParams.get("body") ?? "";
    const seededDirectory = searchParams.get("directory") ?? "";
    setDraftSession({
      directory: seededDirectory,
      needsMetadataBeforeSave: !seededDirectory,
    });
    setSelectedNoteId(null);
    setDraftTitle(seededTitle);
    setDraftBody(seededBody);
    setDraftHash("");
    setSavedTitle("");
    setSavedBody("");
    setSaveState("unsaved");
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
    setDraftSession(null);
    setEditorSelection(null);
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
  const isDraft = draftSession !== null;

  async function handleCreate() {
    try {
      const created = await createNote.mutateAsync({
        directory: createDraft.directory,
        title: draftTitle.trim() || copy.untitledDraftTitle,
        body: draftBody,
      });
      setCreateOpen(false);
      setCreateDraft({ directory: "", title: "", body: "" });
      setDraftSession(null);
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

  const handleSave = useCallback(async () => {
    if (isDraft) {
      return;
    }
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
  }, [draftBody, draftHash, draftTitle, isDraft, selectedNoteId, updateNote]);

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

  async function handleDelete() {
    try {
      await deleteNote.mutateAsync();
      setSelectedNoteId(null);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function handleAssist(_input: NotebookConversationStartInput) {
    if (!note && !isDraft) {
      return;
    }
    setContextTab("ask");
  }

  function startNotebookAssistantConversation() {
    setNotebookAssistantSessionId(globalThis.crypto.randomUUID());
    setContextTab("ask");
  }

  function syncNotebookDraft(nextNote: { title: string; body: string; content_hash: string }) {
    setDraftTitle(nextNote.title);
    setDraftBody(nextNote.body);
    setDraftHash(nextNote.content_hash);
    setSavedTitle(nextNote.title);
    setSavedBody(nextNote.body);
    setSaveState("saved");
    setEditorSelection(null);
  }

  useEffect(() => {
    if (isDraft) {
      return;
    }
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
  }, [draftBody, draftTitle, dirty, handleSave, isDraft, note]);

  useEffect(() => {
    if (!createOpen || !draftSession) {
      return;
    }
    setCreateDraft((current) => ({
      ...current,
      directory: current.directory || draftSession.directory,
    }));
  }, [createOpen, draftSession]);

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
    setDraftSession({
      directory,
      needsMetadataBeforeSave: false,
    });
    setSelectedNoteId(null);
    setDraftTitle("");
    setDraftBody("");
    setDraftHash("");
    setSavedTitle("");
    setSavedBody("");
    setSaveState("unsaved");
    setContextTab("ask");
    setNotebookAssistantSessionId(globalThis.crypto.randomUUID());
    setEditorSelection(null);
  }

  function openRenameNoteDialog(noteId: string) {
    setSelectedNoteId(noteId);
    setRenameOpen(true);
  }

  function openMoveNoteDialog(noteId: string) {
    setSelectedNoteId(noteId);
    setMoveOpen(true);
  }

  function openDeleteNoteDialog(noteId: string) {
    setSelectedNoteId(noteId);
    setDeleteOpen(true);
  }

  async function handleMoveNoteToDirectory(noteId: string, directory: string) {
    try {
      await moveAnyNote.mutateAsync({ noteId, directory });
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleMoveDirectoryToDirectory(directory: string, parentDirectory: string) {
    try {
      await moveAnyDirectory.mutateAsync({ directory, parent_directory: parentDirectory });
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function openDraftComposer() {
    setDraftSession({
      directory: "",
      needsMetadataBeforeSave: true,
    });
    setSelectedNoteId(null);
    setDraftTitle("");
    setDraftBody("");
    setDraftHash("");
    setSavedTitle("");
    setSavedBody("");
    setSaveState("unsaved");
    setContextTab("ask");
    setNotebookAssistantSessionId(globalThis.crypto.randomUUID());
    setEditorSelection(null);
  }

  useEffect(() => {
    if (!selectedNoteId) {
      return;
    }
    setNotebookAssistantSessionId(globalThis.crypto.randomUUID());
  }, [selectedNoteId]);

  function handleSaveDraft() {
    if (!draftSession) {
      return;
    }
    setCreateDraft({
      directory: draftSession.directory,
      title: draftTitle,
      body: draftBody,
    });
    if (draftSession.needsMetadataBeforeSave) {
      setCreateOpen(true);
      return;
    }
    void handleCreate();
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
            <div className="mx-4 mt-4 rounded-2xl border border-[#f4c7cc] bg-[var(--notebook-danger-surface)] px-4 py-3 text-sm text-[var(--notebook-danger)]">
              {error instanceof Error ? error.message : String(error)}
            </div>
          ) : null}

          <div
            className="grid min-h-0 flex-1 gap-4 p-4 transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              gridTemplateColumns: `${leftRailCollapsed ? "3.75rem" : "17.5rem"} minmax(0, 1fr) ${rightRailCollapsed ? "3.75rem" : "20rem"}`,
            }}
          >
            <NotebookSidebar
              activePath={selectedFile?.path ?? null}
              collapsed={leftRailCollapsed}
              copy={{
                createFolder: copy.createFolder,
                createNote: copy.createNote,
                createNoteHere: copy.createNoteHere,
                createSubfolder: copy.createSubfolder,
                deleteFolder: copy.deleteFolder,
                deleteNote: copy.delete,
                emptyDescription: copy.emptyDescription,
                emptyTitle: copy.emptyTitle,
                moveNote: copy.move,
                noteListDescription: copy.noteListDescription,
                noteListTitle: copy.noteListTitle,
                quickCaptureLabel: copy.quickCapture,
                recentTitle: copy.recentTitle,
                renameFolder: copy.renameFolder,
                renameNote: copy.rename,
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
              onOpenCreate={() => openDraftComposer()}
              onOpenCreateFolder={() => openCreateFolderDialog("")}
              onOpenCreateInDirectory={openCreateDialogInDirectory}
              onOpenCreateSubfolder={openCreateFolderDialog}
              onOpenDeleteDirectory={openDeleteFolderDialog}
              onOpenDeleteNote={openDeleteNoteDialog}
              onMoveDirectoryToDirectory={handleMoveDirectoryToDirectory}
              onOpenMoveNote={openMoveNoteDialog}
              onOpenQuickCapture={() => setQuickCaptureOpen(true)}
              onMoveNoteToDirectory={handleMoveNoteToDirectory}
              onMoveNodeToRoot={(payload) => {
                if (payload.kind === "file") {
                  void handleMoveNoteToDirectory(payload.noteId, "");
                  return;
                }
                void handleMoveDirectoryToDirectory(payload.path, "");
              }}
              onOpenRenameDirectory={openRenameFolderDialog}
              onOpenRenameNote={openRenameNoteDialog}
              onQueryChange={setQuery}
              onOpenTrash={() => router.push(pathOfNotebookTrash())}
              onSelectNote={setSelectedNoteId}
              onToggleCollapse={() => setLeftRailCollapsed((value) => !value)}
            />

            <NotebookEditorPane
              copy={{
                delete: copy.delete,
                edit: copy.edit,
                history: copy.history,
                lastEditedPrefix: "最后编辑于",
                move: copy.move,
                noSelectionCta: copy.createNote,
                noSelectionDescription: copy.noSelectionDescription,
                noSelectionTitle: copy.noSelectionTitle,
                noteTitlePlaceholder: copy.noteTitlePlaceholder,
                preview: copy.preview,
                rename: copy.rename,
                saved: copy.saved,
                saveDraft: copy.saveDraft,
                saving: copy.saving,
                selectNote: copy.selectNote,
                draftMetaLabel: copy.draftMetaLabel,
                untitledDraftTitle: copy.untitledDraftTitle,
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
              onOpenRename={() => setRenameOpen(true)}
              onOpenMove={() => setMoveOpen(true)}
              onPrimaryCreate={() => openDraftComposer()}
              draftDirectory={draftSession?.directory ?? ""}
              isDraft={isDraft}
              onSaveDraft={handleSaveDraft}
              onSelectionChange={setEditorSelection}
            />

            <NotebookContextPanel
              activeTab={contextTab}
              collapsed={rightRailCollapsed}
              copy={{
                askTab: copy.askTab,
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
              notebookAssistantSessionId={notebookAssistantSessionId}
              onActiveTabChange={setContextTab}
              onApplyNote={syncNotebookDraft}
              onStartNewConversation={startNotebookAssistantConversation}
              onToggleCollapse={() => setRightRailCollapsed((value) => !value)}
            />
          </div>
        </div>
      </section>

      <NotebookCreateDialog
        copy={{
          cancel: t.common.cancel,
          confirmSaveDraft: copy.confirmSaveDraft,
          createDialogDescription: copy.createDialogDescription,
          createDialogTitle: copy.createDialogTitle,
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
        title={draftTitle}
        onDirectoryChange={(value) =>
          setCreateDraft((current) => ({ ...current, directory: value }))
        }
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        onTitleChange={setDraftTitle}
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

      <NotebookDialogShell
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={copy.rename}
      >
        <div className="space-y-4 p-6">
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            placeholder={copy.renamePlaceholder}
            className="border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)] placeholder:text-[var(--notebook-soft-text)]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)] hover:bg-[var(--notebook-hover)]"
              onClick={() => setRenameOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              className="bg-[var(--notebook-brand)] text-[var(--notebook-panel)] hover:opacity-90"
              onClick={handleRename}
              disabled={!renameValue.trim() || renameNote.isPending}
            >
              {copy.save}
            </Button>
          </DialogFooter>
        </div>
      </NotebookDialogShell>

      <NotebookDialogShell
        open={moveOpen}
        onOpenChange={setMoveOpen}
        title={copy.move}
      >
        <div className="space-y-4 p-6">
          <NotebookFolderPicker
            emptyLabel={copy.folderPickerEmpty}
            options={directoryOptions}
            placeholder={copy.selectFolderPlaceholder}
            value={moveDirectory}
            onValueChange={setMoveDirectory}
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)] hover:bg-[var(--notebook-hover)]"
              onClick={() => setMoveOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              className="bg-[var(--notebook-brand)] text-[var(--notebook-panel)] hover:opacity-90"
              onClick={handleMove}
              disabled={moveNote.isPending}
            >
              {copy.save}
            </Button>
          </DialogFooter>
        </div>
      </NotebookDialogShell>

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
