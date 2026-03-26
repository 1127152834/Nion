export interface NotebookDirectoryEntry {
  path: string;
  name: string;
  depth: number;
  child_count: number;
  mtime: number | null;
}

export interface NotebookFileEntry {
  note_id?: string | null;
  path: string;
  name: string;
  depth: number;
  size: number;
  mtime: number | null;
}

export interface NotebookTreeResponse {
  root: string;
  generated_at: string;
  depth: number;
  truncated: boolean;
  directories: NotebookDirectoryEntry[];
  files: NotebookFileEntry[];
}

export interface NotebookNote {
  note_id: string;
  title: string;
  relative_path: string;
  absolute_path: string;
  created_at: string;
  updated_at: string;
  content_hash: string;
  body: string;
}

export interface NotebookHistoryEntry {
  version_id: string;
  note_id: string;
  parent_version_id?: string | null;
  operation: string;
  actor_type: string;
  timestamp: string;
  path_at_time: string;
  content_hash_after?: string | null;
  diff_text?: string | null;
  restored_from_version_id?: string | null;
  trash_path?: string | null;
}

export interface NotebookDeletePreview {
  note_id: string;
  title: string;
  relative_path: string;
  summary: string;
}

export interface NotebookDeletedNotePreview {
  note_id: string;
  title: string;
  relative_path: string;
  summary: string;
  deleted_at?: string | null;
}

export interface NotebookCreateInput {
  directory: string;
  title: string;
  body: string;
}

export interface NotebookUpdateInput {
  body: string;
  expected_content_hash: string;
  title?: string;
}

export interface NotebookRenameInput {
  title: string;
}

export interface NotebookMoveInput {
  directory: string;
}

export interface NotebookRestoreVersionInput {
  version_id: string;
}
