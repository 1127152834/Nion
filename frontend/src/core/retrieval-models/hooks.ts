import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  loadRetrievalModelsStatus,
  rebuildRetrievalConsumerIndexes,
  saveRetrievalModelsProfile,
  testRetrievalEmbeddingProfile,
  testRetrievalRerankerProfile,
} from "./api";
import type {
  RebuildRetrievalConsumersResult,
  RetrievalModelsStatusResponse,
  SaveRetrievalModelsProfileRequest,
  TestRetrievalEmbeddingRequest,
  TestRetrievalEmbeddingResult,
  TestRetrievalRerankerRequest,
  TestRetrievalRerankerResult,
} from "./types";

export function useRetrievalModelsStatus({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["retrieval-models", "status"],
    queryFn: () => loadRetrievalModelsStatus(),
    enabled,
  });
}

export function useSaveRetrievalModelsProfile() {
  const queryClient = useQueryClient();

  return useMutation<RetrievalModelsStatusResponse, Error, SaveRetrievalModelsProfileRequest>({
    mutationFn: (request) => saveRetrievalModelsProfile(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["retrieval-models", "status"] });
      await queryClient.invalidateQueries({ queryKey: ["memory-settings"] });
    },
  });
}

export function useTestRetrievalEmbeddingProfile() {
  return useMutation<TestRetrievalEmbeddingResult, Error, TestRetrievalEmbeddingRequest>({
    mutationFn: (request) => testRetrievalEmbeddingProfile(request),
  });
}

export function useTestRetrievalRerankerProfile() {
  return useMutation<TestRetrievalRerankerResult, Error, TestRetrievalRerankerRequest>({
    mutationFn: (request) => testRetrievalRerankerProfile(request),
  });
}

export function useRebuildRetrievalConsumerIndexes() {
  const queryClient = useQueryClient();

  return useMutation<RebuildRetrievalConsumersResult, Error, string[]>({
    mutationFn: (consumerIds) => rebuildRetrievalConsumerIndexes(consumerIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["retrieval-models", "status"] });
      await queryClient.invalidateQueries({ queryKey: ["memory-settings"] });
    },
  });
}
