import type { NotebookInboxItem } from "./types";

export function splitNotebookInboxItems(items: NotebookInboxItem[]) {
  return {
    notes: items.filter((item) => item.entry_type === "note"),
    assets: items.filter((item) => item.entry_type === "asset"),
  };
}

export function hasNotebookInboxItems(items: NotebookInboxItem[]) {
  return items.length > 0;
}
