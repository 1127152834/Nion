import { getBackendBaseURL } from "../config/index.ts";

import type {
  NotebookCreateInput,
  NotebookDeletePreview,
  NotebookDeletedNotePreview,
  NotebookHistoryEntry,
  NotebookMoveInput,
  NotebookNote,
  NotebookRenameInput,
  NotebookRestoreVersionInput,
  NotebookTreeResponse,
  NotebookUpdateInput,
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

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function loadNotebookTree(): Promise<NotebookTreeResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/notebook/tree`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load notebook tree (${response.status})`,
      ),
    );
  }
  return readJson<NotebookTreeResponse>(response);
}

export async function loadNotebookTrash(): Promise<NotebookDeletedNotePreview[]> {
  const response = await fetch(`${getBackendBaseURL()}/api/notebook/trash`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load notebook trash (${response.status})`,
      ),
    );
  }
  const json = await readJson<{ notes: NotebookDeletedNotePreview[] }>(response);
  return json.notes;
}

export async function loadNotebookNote(noteId: string): Promise<NotebookNote> {
  const response = await fetch(`${getBackendBaseURL()}/api/notebook/notes/${noteId}`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load notebook note (${response.status})`,
      ),
    );
  }
  const json = await readJson<{ note: NotebookNote }>(response);
  return json.note;
}

export async function createNotebookNote(input: NotebookCreateInput): Promise<NotebookNote> {
  const response = await fetch(`${getBackendBaseURL()}/api/notebook/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to create notebook note (${response.status})`,
      ),
    );
  }
  const json = await readJson<{ note: NotebookNote }>(response);
  return json.note;
}

export async function updateNotebookNote(
  noteId: string,
  input: NotebookUpdateInput,
): Promise<NotebookNote> {
  const response = await fetch(`${getBackendBaseURL()}/api/notebook/notes/${noteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to update notebook note (${response.status})`,
      ),
    );
  }
  const json = await readJson<{ note: NotebookNote }>(response);
  return json.note;
}

export async function renameNotebookNote(
  noteId: string,
  input: NotebookRenameInput,
): Promise<NotebookNote> {
  const response = await fetch(`${getBackendBaseURL()}/api/notebook/notes/${noteId}/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to rename notebook note (${response.status})`,
      ),
    );
  }
  const json = await readJson<{ note: NotebookNote }>(response);
  return json.note;
}

export async function moveNotebookNote(
  noteId: string,
  input: NotebookMoveInput,
): Promise<NotebookNote> {
  const response = await fetch(`${getBackendBaseURL()}/api/notebook/notes/${noteId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to move notebook note (${response.status})`,
      ),
    );
  }
  const json = await readJson<{ note: NotebookNote }>(response);
  return json.note;
}

export async function loadNotebookHistory(
  noteId: string,
): Promise<NotebookHistoryEntry[]> {
  const response = await fetch(`${getBackendBaseURL()}/api/notebook/notes/${noteId}/history`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load notebook history (${response.status})`,
      ),
    );
  }
  const json = await readJson<{ entries: NotebookHistoryEntry[] }>(response);
  return json.entries;
}

export async function restoreNotebookVersion(
  noteId: string,
  input: NotebookRestoreVersionInput,
): Promise<NotebookNote> {
  const response = await fetch(`${getBackendBaseURL()}/api/notebook/notes/${noteId}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to restore notebook version (${response.status})`,
      ),
    );
  }
  const json = await readJson<{ note: NotebookNote }>(response);
  return json.note;
}

export async function getNotebookDeletePreview(
  noteId: string,
): Promise<NotebookDeletePreview> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/notebook/notes/${noteId}/delete-preview`,
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load notebook delete preview (${response.status})`,
      ),
    );
  }
  return readJson<NotebookDeletePreview>(response);
}

export async function deleteNotebookNote(noteId: string): Promise<{ note_id: string; trash_path: string }> {
  const response = await fetch(`${getBackendBaseURL()}/api/notebook/notes/${noteId}/delete`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to delete notebook note (${response.status})`,
      ),
    );
  }
  const json = await readJson<{ deleted: { note_id: string; trash_path: string } }>(response);
  return json.deleted;
}

export async function restoreDeletedNotebookNote(noteId: string): Promise<NotebookNote> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/notebook/notes/${noteId}/restore-deleted`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to restore deleted notebook note (${response.status})`,
      ),
    );
  }
  const json = await readJson<{ note: NotebookNote }>(response);
  return json.note;
}
