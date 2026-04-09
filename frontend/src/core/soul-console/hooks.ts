import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  editSoulLayer,
  freezeSoulLayerAutoEvolution,
  loadSoulConsole,
  rollbackSoulOverlay,
} from "./api";

export function useSoulConsole() {
  const query = useQuery({
    queryKey: ["soul", "console"],
    queryFn: () => loadSoulConsole(),
  });

  return {
    soulConsole: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useEditSoulLayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      layer,
      summary,
    }: {
      layer: "relationship_stance" | "adaptive_overlay";
      summary: string;
    }) => editSoulLayer(layer, summary),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["soul"] }),
        queryClient.invalidateQueries({ queryKey: ["memory-growth"] }),
      ]);
    },
  });
}

export function useRollbackSoulOverlay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rollbackSoulOverlay(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["soul"] }),
        queryClient.invalidateQueries({ queryKey: ["memory-growth"] }),
      ]);
    },
  });
}

export function useFreezeSoulLayerAutoEvolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      layer,
    }: {
      layer:
        | "constitution"
        | "identity_narrative"
        | "relationship_stance"
        | "adaptive_overlay";
    }) => freezeSoulLayerAutoEvolution(layer),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["soul"] });
    },
  });
}
