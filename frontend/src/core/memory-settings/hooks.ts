import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  downloadMemoryEmbeddingAssets,
  loadMemorySettings,
  patchMemorySettings,
  rebuildMemoryVectorIndex,
} from "./api";
import type {
  MemorySettingsActionResult,
  MemorySettingsPatchRequest,
  MemorySettingsResponse,
} from "./types";

const EMPTY_MEMORY_SETTINGS: MemorySettingsResponse = {
  provider_mode: {
    id: "remote_managed",
    label: "外部接口",
    description: "通过外部 embedding 服务为长期记忆提供语义检索能力。",
  },
  download_status: {
    state: "loading",
    detail: "正在加载 embedding 设置快照。",
    progress: {
      percent: 0,
      downloaded_bytes: 0,
      total_bytes: 0,
    },
  },
  active_fingerprint: {
    provider_key: "",
    model_key: "",
    fingerprint: "",
    dimensions: 0,
    distance_metric: "cosine",
    revision: null,
  },
  index_health: {
    state: "loading",
    detail: "正在检查索引状态。",
    record_count: 0,
    last_rebuild_at: null,
  },
  remote_config: {
    endpoint: "",
    api_key_configured: false,
    model_name: "text-embedding-3-large",
    dimensions: 3072,
  },
};

export function useMemorySettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-settings"],
    queryFn: () => loadMemorySettings(),
  });

  return {
    settings: data ?? EMPTY_MEMORY_SETTINGS,
    isLoading,
    error,
  };
}

export function usePatchMemorySettings() {
  const queryClient = useQueryClient();

  return useMutation<MemorySettingsResponse, Error, MemorySettingsPatchRequest>({
    mutationFn: (request) => patchMemorySettings(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory-settings"] });
    },
  });
}

export function useDownloadMemoryEmbeddingAssets() {
  const queryClient = useQueryClient();

  return useMutation<MemorySettingsActionResult, Error>({
    mutationFn: () => downloadMemoryEmbeddingAssets(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory-settings"] });
    },
  });
}

export function useRebuildMemoryVectorIndex() {
  const queryClient = useQueryClient();

  return useMutation<MemorySettingsActionResult, Error>({
    mutationFn: () => rebuildMemoryVectorIndex(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory-settings"] });
    },
  });
}
