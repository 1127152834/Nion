import { useQuery } from "@tanstack/react-query";

import { loadMemoryEvidence } from "./api";
import type { MemoryEvidenceQuery, MemoryEvidenceResponse } from "./types";

function emptyEvidence(query: MemoryEvidenceQuery): MemoryEvidenceResponse {
  return {
    items: [],
    paging: {
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      total: 0,
    },
  };
}

export function useMemoryEvidence(query: MemoryEvidenceQuery = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-evidence", query],
    queryFn: () => loadMemoryEvidence(query),
  });

  return {
    evidence: data ?? emptyEvidence(query),
    isLoading,
    error,
  };
}
