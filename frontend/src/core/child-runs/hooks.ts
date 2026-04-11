import { useQuery } from "@tanstack/react-query";

import { loadChildRun, loadChildRuns } from "./api";

export function useChildRuns(threadId: string | null | undefined) {
  return useQuery({
    queryKey: ["child-runs", "list", threadId],
    queryFn: () => loadChildRuns(threadId as string),
    enabled: !!threadId,
  });
}

export function useChildRun(
  threadId: string | null | undefined,
  childRunId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["child-runs", "detail", threadId, childRunId],
    queryFn: () => loadChildRun(threadId as string, childRunId as string),
    enabled: !!threadId && !!childRunId,
  });
}
