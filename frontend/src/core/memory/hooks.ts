import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearMemory,
  createMemoryFact,
  deleteMemoryFact,
  importMemory,
  loadMemory,
  updateMemoryFact,
} from "./api";
import type {
  MemoryFactInput,
  MemoryFactPatchInput,
  MemoryUserFacing,
  UserMemory,
} from "./types";

export function useMemory() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory"],
    queryFn: () => loadMemory(),
  });
  return { memory: (data ?? null) as MemoryUserFacing | null, isLoading, error };
}

export function useClearMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearMemory(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}

export function useDeleteMemoryFact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (factId: string) => deleteMemoryFact(factId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}

export function useImportMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memory: UserMemory) => importMemory(memory),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}

export function useCreateMemoryFact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MemoryFactInput) => createMemoryFact(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}

export function useUpdateMemoryFact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      factId,
      input,
    }: {
      factId: string;
      input: MemoryFactPatchInput;
    }) => updateMemoryFact(factId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}
