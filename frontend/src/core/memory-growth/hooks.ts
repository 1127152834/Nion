import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptMemoryGrowthItem,
  correctUserModelItem,
  freezeMemoryGrowthItem,
  forgetUserModelItem,
  freezeUserModelItem,
  loadUserModelItems,
  loadMemoryGrowth,
  rejectUserModelItem,
  resumeMemoryGrowthItem,
  rejectMemoryGrowthItem,
} from "./api";

export function useMemoryGrowth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-growth"],
    queryFn: () => loadMemoryGrowth(),
  });
  return { growth: data ?? null, isLoading, error };
}

export function useUserModelItems() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-user-model-items"],
    queryFn: () => loadUserModelItems(),
  });
  return { items: data ?? [], isLoading, error };
}

export function useFreezeMemoryGrowthItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) => freezeMemoryGrowthItem(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-growth"] });
    },
  });
}

export function useRejectMemoryGrowthItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) => rejectMemoryGrowthItem(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-growth"] });
    },
  });
}

export function useResumeMemoryGrowthItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) => resumeMemoryGrowthItem(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-growth"] });
    },
  });
}

export function useAcceptMemoryGrowthItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) => acceptMemoryGrowthItem(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-growth"] });
    },
  });
}

export function useFreezeUserModelItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) => freezeUserModelItem(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-growth"] });
      queryClient.invalidateQueries({ queryKey: ["memory-user-model-items"] });
    },
  });
}

export function useForgetUserModelItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) => forgetUserModelItem(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-user-model-items"] });
    },
  });
}

export function useRejectUserModelItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) => rejectUserModelItem(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-user-model-items"] });
    },
  });
}

export function useCorrectUserModelItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memoryId, summary }: { memoryId: string; summary: string }) =>
      correctUserModelItem(memoryId, summary),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-user-model-items"] });
    },
  });
}
