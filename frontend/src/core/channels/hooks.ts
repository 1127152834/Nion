import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadChannelOps, restartChannel } from "./api";

export function useChannelOps() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["channel-ops"],
    queryFn: () => loadChannelOps(),
  });

  return {
    channelOps: data ?? null,
    isLoading,
    error,
  };
}

export function useRestartChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => restartChannel(name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["channel-ops"] });
    },
  });
}
