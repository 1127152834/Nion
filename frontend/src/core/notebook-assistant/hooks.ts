import { useMutation } from "@tanstack/react-query";

import type { NotebookAssistantSessionInput } from "./types.ts";

export const notebookAssistantQueryKeys = {
  session: (noteId: string | null, sessionId: string | null) =>
    ["notebook-assistant", "session", noteId, sessionId] as const,
  rewrite: (noteId: string | null) =>
    ["notebook-assistant", "rewrite", noteId] as const,
};

export function useCreateOrResumeNotebookAssistantSession() {
  return useMutation({
    mutationFn: async (input: NotebookAssistantSessionInput) => {
      const { createOrResumeNotebookAssistantSession } = await import("./api.ts");
      return createOrResumeNotebookAssistantSession(input);
    },
  });
}
