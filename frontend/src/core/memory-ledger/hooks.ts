import { useQuery } from "@tanstack/react-query";

import { loadMemoryLedger } from "./api";
import type { MemoryLedgerResponse } from "./types";

const EMPTY_MEMORY_LEDGER: MemoryLedgerResponse = {
  nodes: [],
  current_revisions: [],
};

export function useMemoryLedger() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-ledger"],
    queryFn: () => loadMemoryLedger(),
  });

  return {
    ledger: data ?? EMPTY_MEMORY_LEDGER,
    isLoading,
    error,
  };
}
