"use client";

import { ChevronRightIcon, Clock3Icon, FileTextIcon, FolderIcon, FolderPlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { buildNotebookTree, type NotebookTreeNode } from "@/core/notebook";
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

        <div className="grid min-h-[70vh] grid-cols-[320px_minmax(0,1fr)] rounded-xl border">
          <div className="min-w-0 border-r">
            <Card className="h-full rounded-none border-0 shadow-none">
              <CardHeader className="gap-3 border-b">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>{copy.noteListTitle}</CardTitle>
                    <CardDescription>{copy.noteListDescription}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => router.push(pathOfNotebookTrash())}>
                      <Trash2Icon className="size-4" />
                      {copy.trashTitle}
                    </Button>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <FolderPlusIcon className="size-4" />
                      {copy.createNote}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(70vh-96px)]">
                  <div className="space-y-2 p-3">
                    {isLoading ? (
                      <div className="text-muted-foreground text-sm">{t.common.loading}</div>
                    ) : tree.files.length === 0 ? (
                      <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                        <div className="font-medium">{copy.emptyTitle}</div>
                        <div className="mt-1">{copy.emptyDescription}</div>
                      </div>
                    ) : (
                      treeNodes.map((node) => (
                        <NotebookTreeItem
                          key={node.path}
                          node={node}
                          activePath={selectedFile?.path ?? null}
                          onSelect={setSelectedNoteId}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-0">
            <Card className="h-full rounded-none border-0 shadow-none">
              <CardHeader className="border-b">
                {!note ? (
                  <div className="space-y-1">
                    <CardTitle>{copy.noSelectionTitle}</CardTitle>
                    <CardDescription>{copy.noSelectionDescription}</CardDescription>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2 rounded-xl border border-dashed bg-muted/20 p-3">
                      <div className="text-sm font-medium">{copy.assistTitle}</div>
                      <p className="text-muted-foreground text-sm">
                        {copy.assistDescription}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleAssist("summarize")}>
                          {copy.assistSummarize}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAssist("rewrite")}>
                          {copy.assistRewrite}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAssist("expand")}>
                          {copy.assistExpand}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAssist("checklist")}>
                          {copy.assistChecklist}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAssist("action_items")}>
                          {copy.assistActionItems}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle>{draftTitle || copy.selectNote}</CardTitle>
                        <CardDescription>{note.relative_path}</CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={dirty ? "outline" : "secondary"}>
                          {dirty ? copy.unsaved : copy.saved}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => setRenameOpen(true)}>
                          {copy.rename}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMoveOpen(true)}>
                          {copy.move}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                          <Clock3Icon className="size-4" />
                          {copy.history}
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={!dirty || updateNote.isPending}>
                          <SaveIcon className="size-4" />
                          {updateNote.isPending ? copy.saving : copy.save}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                          <Trash2Icon className="size-4" />
                          {copy.delete}
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder={copy.noteTitlePlaceholder}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="h-[calc(70vh-120px)] p-0">
                {!note || noteLoading ? (
                  <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                    {noteLoading ? t.common.loading : copy.noSelectionDescription}
                  </div>
                ) : (
                  <Textarea
                    value={draftBody}
                    onChange={(event) => setDraftBody(event.target.value)}
                    className="h-full min-h-full rounded-none border-0 px-6 py-5 font-mono text-sm shadow-none focus-visible:ring-0"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
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

function NotebookTreeItem({
  node,
  activePath,
  onSelect,
}: {
  node: NotebookTreeNode;
  activePath: string | null;
  onSelect: (noteId: string | null) => void;
}) {
  if (node.kind === "file") {
    const active = node.path === activePath;
    return (
      <button
        type="button"
        onClick={() => onSelect(node.note_id ?? null)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${active ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
      >
        <FileTextIcon className="text-muted-foreground size-4 shrink-0" />
        <div className="min-w-0">
          <div className="truncate font-medium">{node.name}</div>
          <div className="text-muted-foreground truncate text-xs">{node.path}</div>
        </div>
      </button>
    );
  }

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm">
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <FolderIcon className="text-muted-foreground size-4" />
        <span className="truncate font-medium">{node.name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-2 pl-4">
        {node.children.map((child) => (
          <NotebookTreeItem
            key={child.path}
            node={child}
            activePath={activePath}
            onSelect={onSelect}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
