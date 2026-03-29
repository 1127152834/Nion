export interface OpenVikingNotebookSearchItem {
  resource_uri: string;
  note_id: string;
  title: string;
  source_relative_path: string;
  updated_at: string;
  snippet: string;
  heading_path: string[];
  char_start: number;
  char_end: number;
}

export interface OpenVikingNotebookSearchResponse {
  items: OpenVikingNotebookSearchItem[];
}

export interface OpenVikingNotebookReindexResponse {
  notes_indexed: number;
}

export interface OpenVikingNotebookContextPreviewResponse {
  items: OpenVikingNotebookSearchItem[];
  markdown: string;
}
