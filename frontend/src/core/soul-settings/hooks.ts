import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { applySoulSettings, loadSoulSettings } from "./api";
import type {
  SoulSettingsDraft,
  SoulSettingsMutationResult,
  SoulSettingsResponse,
} from "./types";

const EMPTY_SOUL_SETTINGS: SoulSettingsResponse = {
  core_identity: "目前还没有稳定的核心人格设置。",
  speech_style: "目前还没有稳定的说话方式设置。",
  values_and_boundaries: "目前还没有稳定的价值观与边界设置。",
  relationship_stance: "目前还没有稳定的关系基调设置。",
  has_active_overlay: false,
  adaptive_overlay_summary: null,
};

export function useSoulSettings() {
  const query = useQuery({
    queryKey: ["soul-settings"],
    queryFn: () => loadSoulSettings(),
  });

  return {
    settings: query.data ?? EMPTY_SOUL_SETTINGS,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useApplySoulSettings() {
  const queryClient = useQueryClient();

  return useMutation<SoulSettingsMutationResult, Error, SoulSettingsDraft>({
    mutationFn: (draft) => applySoulSettings(draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["soul-settings"] });
    },
  });
}
