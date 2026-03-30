import { useMutation } from "@tanstack/react-query";

import { createOrResumeNotebookAssistantSession } from "./api.ts";
import type { NotebookAssistantSessionInput } from "./types.ts";

export const notebookAssistantQueryKeys = {
  session: (noteId: string | null, sessionId: string | null) =>
    ["notebook-assistant", "session", noteId, sessionId] as const,
};

export function useCreateOrResumeNotebookAssistantSession() {
  return useMutation({
    mutationFn: async (input: NotebookAssistantSessionInput) =>
      createOrResumeNotebookAssistantSession(input),
  });
}
