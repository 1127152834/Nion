import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  applyNotebookAssist,
  createNotebookDirectory,
  createNotebookNote,
  deleteNotebookDirectory,
  deleteNotebookNote,
  getNotebookDeletePreview,
  importNotebookContent,
  loadNotebookHistory,
  loadNotebookHistoryDetail,
  loadNotebookImportSources,
  loadNotebookNote,
  loadNotebookNotes,
  loadNotebookTrash,
  loadNotebookTree,
  moveNotebookDirectory,
  moveNotebookNote,
  previewNotebookAssist,
  renameNotebookDirectory,
  renameNotebookNote,
  restoreDeletedNotebookNote,
  restoreNotebookVersion,
  updateNotebookMetadata,
  updateNotebookNote,
} from "./api";
import type {
  NotebookAssistApplyInput,
  NotebookAssistPreviewInput,
  NotebookCreateInput,
  NotebookDirectoryCreateInput,
  NotebookDirectoryDeleteInput,
  NotebookDirectoryMoveInput,
  NotebookDirectoryRenameInput,
  NotebookImportInput,
  NotebookImportSourcesResponse,
  NotebookMetadataInput,
  NotebookMoveInput,
  NotebookPendingRewrite,
  NotebookRenameInput,
  NotebookRestoreVersionInput,
  NotebookUpdateInput,
} from "./types";

export function useNotebookTree() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["notebook", "tree"],
    queryFn: () => loadNotebookTree(),
    refetchOnWindowFocus: false,
  });
  return {
    tree: data ?? {
      root: "",
      generated_at: "",
      depth: 0,
      truncated: false,
      directories: [],
      files: [],
    },
    isLoading,
    error,
  };
}

export function useNotebookTrash() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["notebook", "trash"],
    queryFn: () => loadNotebookTrash(),
    refetchOnWindowFocus: false,
  });
  return { notes: data ?? [], isLoading, error };
}

export function useNotebookNotes() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["notebook", "notes"],
    queryFn: () => loadNotebookNotes(),
    refetchOnWindowFocus: false,
  });
  return { notes: data ?? [], isLoading, error };
}

export function useNotebookNote(noteId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["notebook", "note", noteId],
    queryFn: () => loadNotebookNote(noteId!),
    enabled: Boolean(noteId),
    refetchOnWindowFocus: false,
  });
  return { note: data ?? null, isLoading, error };
}

export function useNotebookHistory(noteId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["notebook", "history", noteId],
    queryFn: () => loadNotebookHistory(noteId!),
    enabled: Boolean(noteId),
    refetchOnWindowFocus: false,
  });
  return { entries: data ?? [], isLoading, error };
}

export function useNotebookHistoryDetail(noteId: string | null, versionId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["notebook", "history-detail", noteId, versionId],
    queryFn: () => loadNotebookHistoryDetail(noteId!, versionId!),
    enabled: Boolean(noteId && versionId),
    refetchOnWindowFocus: false,
  });
  return { detail: data ?? null, isLoading, error };
}

export function useNotebookDeletePreview(noteId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["notebook", "delete-preview", noteId],
    queryFn: () => getNotebookDeletePreview(noteId!),
    enabled: Boolean(noteId),
    refetchOnWindowFocus: false,
  });
  return { preview: data ?? null, isLoading, error };
}

export function useCreateNotebookNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookCreateInput) => createNotebookNote(input),
    onSuccess: async (note) => {
      await invalidateNotebookQueries(queryClient, note.note_id);
    },
  });
}

export function useCreateNotebookDirectory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookDirectoryCreateInput) =>
      createNotebookDirectory(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notebook", "tree"] }),
        queryClient.invalidateQueries({ queryKey: ["notebook", "notes"] }),
      ]);
    },
  });
}

export function useRenameNotebookDirectory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookDirectoryRenameInput) =>
      renameNotebookDirectory(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notebook", "tree"] }),
        queryClient.invalidateQueries({ queryKey: ["notebook", "notes"] }),
      ]);
    },
  });
}

export function useDeleteNotebookDirectory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookDirectoryDeleteInput) =>
      deleteNotebookDirectory(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notebook", "tree"] }),
        queryClient.invalidateQueries({ queryKey: ["notebook", "notes"] }),
      ]);
    },
  });
}

export function useMoveNotebookDirectory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookDirectoryMoveInput) =>
      moveNotebookDirectory(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notebook", "tree"] }),
        queryClient.invalidateQueries({ queryKey: ["notebook", "notes"] }),
      ]);
    },
  });
}

export function useUpdateNotebookNote(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookUpdateInput) =>
      updateNotebookNote(noteId, input),
    onSuccess: async (note) => {
      await invalidateNotebookQueries(queryClient, note.note_id);
    },
  });
}

export function useRenameNotebookNote(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookRenameInput) =>
      renameNotebookNote(noteId, input),
    onSuccess: async (note) => {
      await invalidateNotebookQueries(queryClient, note.note_id);
    },
  });
}

export function useMoveNotebookNote(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookMoveInput) => moveNotebookNote(noteId, input),
    onSuccess: async (note) => {
      await invalidateNotebookQueries(queryClient, note.note_id);
    },
  });
}

export function useMoveNotebookNoteAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      noteId,
      directory,
    }: {
      noteId: string;
      directory: string;
    }) => moveNotebookNote(noteId, { directory }),
    onSuccess: async (note) => {
      await invalidateNotebookQueries(queryClient, note.note_id);
    },
  });
}

export function useRestoreNotebookVersion(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookRestoreVersionInput) =>
      restoreNotebookVersion(noteId, input),
    onSuccess: async (note) => {
      await invalidateNotebookQueries(queryClient, note.note_id);
    },
  });
}

export function useDeleteNotebookNote(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => deleteNotebookNote(noteId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notebook", "tree"] }),
        queryClient.invalidateQueries({ queryKey: ["notebook", "history", noteId] }),
        queryClient.invalidateQueries({
          queryKey: ["notebook", "delete-preview", noteId],
        }),
      ]);
      queryClient.removeQueries({ queryKey: ["notebook", "note", noteId] });
    },
  });
}

export function useUpdateNotebookMetadata(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookMetadataInput) =>
      updateNotebookMetadata(noteId, input),
    onSuccess: async (note) => {
      await invalidateNotebookQueries(queryClient, note.note_id);
    },
  });
}

export function usePreviewNotebookAssist(noteId: string) {
  return useMutation({
    mutationFn: async (input: NotebookAssistPreviewInput) =>
      previewNotebookAssist(noteId, input),
  });
}

export function useNotebookImportSources(source: "chat") {
  const query = useQuery<NotebookImportSourcesResponse>({
    queryKey: ["notebook", "import-sources", source],
    queryFn: async () => loadNotebookImportSources(source),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
  return {
    importSources: query.data?.items ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useApplyNotebookAssist(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookAssistApplyInput) =>
      applyNotebookAssist(noteId, input),
    onSuccess: async (note) => {
      await invalidateNotebookQueries(queryClient, note.note_id);
    },
  });
}

export function useImportNotebookContent(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotebookImportInput) =>
      importNotebookContent(noteId, input),
    onSuccess: async (note) => {
      await invalidateNotebookQueries(queryClient, note.note_id);
    },
  });
}

export function useRestoreDeletedNotebookNote(noteId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (explicitNoteId?: string) =>
      restoreDeletedNotebookNote(explicitNoteId ?? noteId ?? ""),
    onSuccess: async (note) => {
      await invalidateNotebookQueries(queryClient, note.note_id);
      await queryClient.invalidateQueries({ queryKey: ["notebook", "trash"] });
    },
  });
}

async function invalidateNotebookQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  noteId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["notebook", "tree"] }),
    queryClient.invalidateQueries({ queryKey: ["notebook", "trash"] }),
    queryClient.invalidateQueries({ queryKey: ["notebook", "notes"] }),
    queryClient.invalidateQueries({ queryKey: ["notebook", "note", noteId] }),
    queryClient.invalidateQueries({ queryKey: ["notebook", "history", noteId] }),
    queryClient.invalidateQueries({ queryKey: ["notebook", "history-detail", noteId] }),
    queryClient.invalidateQueries({
      queryKey: ["notebook", "delete-preview", noteId],
    }),
  ]);
}

export const notebookPendingRewriteQueryKeys = {
  note: (noteId: string) => ["notebook", "pending-rewrite", noteId] as const,
};

export function useNotebookPendingRewrite(initialPendingRewrite: NotebookPendingRewrite | null = null) {
  const [pendingRewrite, setPendingRewrite] = useState<NotebookPendingRewrite | null>(
    initialPendingRewrite,
  );

  return {
    pendingRewrite,
    setPendingRewrite,
    clearPendingRewrite: () => setPendingRewrite(null),
  };
}
