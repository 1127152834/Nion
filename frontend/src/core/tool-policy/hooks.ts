import { useQuery } from "@tanstack/react-query";

import { loadToolPolicy } from "./api";

export function useToolPolicy() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tool-policy"],
    queryFn: () => loadToolPolicy(),
    refetchOnWindowFocus: false,
  });

  return {
    toolPolicy: data ?? null,
    isLoading,
    error,
  };
}
