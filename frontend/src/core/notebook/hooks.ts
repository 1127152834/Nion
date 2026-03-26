import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createNotebookNote,
  deleteNotebookNote,
  getNotebookDeletePreview,
  loadNotebookHistory,
  loadNotebookNote,
  loadNotebookTrash,
  loadNotebookTree,
  moveNotebookNote,
  renameNotebookNote,
  restoreDeletedNotebookNote,
  restoreNotebookVersion,
  updateNotebookNote,
} from "./api";
import type {
  NotebookCreateInput,
  NotebookMoveInput,
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
    queryClient.invalidateQueries({ queryKey: ["notebook", "note", noteId] }),
    queryClient.invalidateQueries({ queryKey: ["notebook", "history", noteId] }),
    queryClient.invalidateQueries({
      queryKey: ["notebook", "delete-preview", noteId],
    }),
  ]);
}
