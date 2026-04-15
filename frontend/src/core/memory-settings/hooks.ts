import { useQuery } from "@tanstack/react-query";

import { loadMemorySettings } from "./api";
import type { MemorySettingsResponse } from "./types";

const EMPTY_MEMORY_SETTINGS: MemorySettingsResponse = {
  retrieval_status: {
    vector_enabled: false,
    reranker_enabled: false,
    detail: "正在读取检索增强状态。",
  },
  index_health: {
    state: "loading",
    detail: "正在检查索引状态。",
    record_count: 0,
    last_rebuild_at: null,
  },
  jump_target: {
    section: "retrievalModels",
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
