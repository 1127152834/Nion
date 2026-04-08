import { useQuery } from "@tanstack/react-query";

import { loadMemorySettings } from "./api";
import type { MemorySettingsResponse } from "./types";

const EMPTY_MEMORY_SETTINGS: MemorySettingsResponse = {
  provider_mode: {
    id: "local_managed",
    label: "本机推荐",
    description: "优先使用桌面托管 embedding，兼顾离线可用性与默认体验。",
  },
  download_status: {
    state: "loading",
    detail: "正在加载 embedding 设置快照。",
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
    vector_path: "",
    artifact_count: 0,
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
