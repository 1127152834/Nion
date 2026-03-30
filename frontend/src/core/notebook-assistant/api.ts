import { getBackendBaseURL } from "../config/index.ts";

import type {
  NotebookAssistantSessionInput,
  NotebookAssistantSessionRecord,
} from "./types.ts";

function resolveErrorMessage(rawText: string, fallback: string): string {
  const text = rawText.trim();
  if (!text) {
    return fallback;
  }
  try {
    const payload = JSON.parse(text) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
  } catch {
    // keep raw text
  }
  return text;
}

export async function createOrResumeNotebookAssistantSession(
  input: NotebookAssistantSessionInput,
): Promise<NotebookAssistantSessionRecord> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/threads/notebook-assistant/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note_id: input.noteId,
        session_id: input.sessionId,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to create notebook assistant session (${response.status})`,
      ),
    );
  }
  return (await response.json()) as NotebookAssistantSessionRecord;
}
