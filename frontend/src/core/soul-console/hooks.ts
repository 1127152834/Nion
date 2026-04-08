import { useQuery } from "@tanstack/react-query";

import { useMemoryLedger } from "@/core/memory-ledger/hooks";

import { loadSoulConsole } from "./api";

export function useSoulConsole() {
  const { ledger, isLoading: ledgerLoading, error: ledgerError } = useMemoryLedger();
  const query = useQuery({
    queryKey: ["soul", "console", ledger.current_revisions.length],
    queryFn: () => loadSoulConsole(ledger.current_revisions),
    enabled: !ledgerLoading && !ledgerError,
  });

  return {
    soulConsole: query.data ?? null,
    isLoading: ledgerLoading || query.isLoading,
    error: ledgerError ?? query.error,
  };
}
