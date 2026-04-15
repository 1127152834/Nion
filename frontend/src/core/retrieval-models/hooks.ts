import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getDesktopRetrievalModelsBridge } from "../api/desktop-client";

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
  RetrievalDesktopModelActionResult,
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

export function useDesktopRetrievalCatalog({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["retrieval-models", "desktop-catalog"],
    queryFn: async () => {
      const bridge = getDesktopRetrievalModelsBridge();
      if (!bridge?.listRetrievalModels || !bridge.listRetrievalPacks) {
        return null;
      }
      const [models, packs] = await Promise.all([
        bridge.listRetrievalModels(),
        bridge.listRetrievalPacks(),
      ]);
      return { models, packs };
    },
    enabled,
  });
}

export function useDesktopRetrievalDownloadProgress() {
  const [progress, setProgress] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const bridge = getDesktopRetrievalModelsBridge();
    if (!bridge?.onRetrievalModelDownloadProgress) {
      return undefined;
    }
    const dispose = bridge.onRetrievalModelDownloadProgress((payload) => {
      if (payload && typeof payload === "object") {
        setProgress(payload as Record<string, unknown>);
      }
    });
    return typeof dispose === "function" ? dispose : undefined;
  }, []);

  return progress;
}

function desktopActionMutation(
  action:
    | ((id: string) => Promise<{ success?: boolean; message?: string }>)
    | undefined,
) {
  return async (id: string): Promise<RetrievalDesktopModelActionResult> => {
    if (!action) {
      throw new Error("Desktop retrieval model bridge is unavailable.");
    }
    const result = await action(id);
    return {
      success: result?.success === true,
      message: result?.message ?? "",
    };
  };
}

export function useDesktopRetrievalModelActions() {
  const queryClient = useQueryClient();
  const bridge = getDesktopRetrievalModelsBridge();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["retrieval-models", "desktop-catalog"] });
  };

  return {
    downloadModel: useMutation<RetrievalDesktopModelActionResult, Error, string>({
      mutationFn: desktopActionMutation(bridge?.downloadRetrievalModel),
      onSuccess: invalidate,
    }),
    cancelModel: useMutation<RetrievalDesktopModelActionResult, Error, string>({
      mutationFn: desktopActionMutation(bridge?.cancelRetrievalModel),
      onSuccess: invalidate,
    }),
    removeModel: useMutation<RetrievalDesktopModelActionResult, Error, string>({
      mutationFn: desktopActionMutation(bridge?.removeRetrievalModel),
      onSuccess: invalidate,
    }),
    importModel: useMutation<RetrievalDesktopModelActionResult, Error, string>({
      mutationFn: desktopActionMutation(bridge?.importRetrievalModel),
      onSuccess: invalidate,
    }),
    downloadPack: useMutation<RetrievalDesktopModelActionResult, Error, string>({
      mutationFn: desktopActionMutation(bridge?.downloadRetrievalPack),
      onSuccess: invalidate,
    }),
    cancelPack: useMutation<RetrievalDesktopModelActionResult, Error, string>({
      mutationFn: desktopActionMutation(bridge?.cancelRetrievalPack),
      onSuccess: invalidate,
    }),
    removePack: useMutation<RetrievalDesktopModelActionResult, Error, string>({
      mutationFn: desktopActionMutation(bridge?.removeRetrievalPack),
      onSuccess: invalidate,
    }),
    importPack: useMutation<RetrievalDesktopModelActionResult, Error, string>({
      mutationFn: desktopActionMutation(bridge?.importRetrievalPack),
      onSuccess: invalidate,
    }),
  };
}
