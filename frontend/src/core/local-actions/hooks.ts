import { useQuery } from "@tanstack/react-query";

import { loadLocalActionsHistory } from "./api";

export function useLocalActionsHistory({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["local-actions", "history"],
    queryFn: () => loadLocalActionsHistory(),
    enabled,
  });
}
