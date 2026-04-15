import { useQuery } from "@tanstack/react-query";

import { loadRetrievalModelsStatus } from "./api";

export function useRetrievalModelsStatus({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["retrieval-models", "status"],
    queryFn: () => loadRetrievalModelsStatus(),
    enabled,
  });
}
