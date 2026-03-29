import { useMutation, useQuery } from "@tanstack/react-query";

import {
  loadNotebookContextPreview,
  reindexNotebookResources,
  searchNotebookResources,
} from "./api";

export function useReindexNotebookResources() {
  return useMutation({
    mutationFn: async () => reindexNotebookResources(),
  });
}

export function useNotebookResourceSearch(query: string, limit = 5) {
  const normalized = query.trim();
  return useQuery({
    queryKey: ["openviking", "notebook-search", normalized, limit],
    queryFn: async () => searchNotebookResources(normalized, limit),
    enabled: normalized.length > 0,
  });
}

export function useNotebookContextPreview(query: string, limit = 5) {
  const normalized = query.trim();
  return useQuery({
    queryKey: ["openviking", "notebook-context-preview", normalized, limit],
    queryFn: async () => loadNotebookContextPreview(normalized, limit),
    enabled: normalized.length > 0,
  });
}
