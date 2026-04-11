import { useQuery } from "@tanstack/react-query";

import { getChildRun, listChildRuns } from "./api";

export function useChildRuns(threadId: string | null | undefined) {
  return useQuery({
    queryKey: ["child-runs", threadId],
    queryFn: () => listChildRuns(threadId!),
    enabled: Boolean(threadId),
  });
}

export function useChildRun(
  threadId: string | null | undefined,
  childRunId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["child-runs", threadId, childRunId],
    queryFn: () => getChildRun(threadId!, childRunId!),
    enabled: Boolean(threadId && childRunId),
  });
}
