import type { NotebookNote } from "./types";

export type NotebookAssistAction =
  | "summarize"
  | "rewrite"
  | "expand"
  | "checklist"
  | "action_items";

export function buildNotebookAssistPrompt(
  note: Pick<NotebookNote, "title" | "body">,
  action: NotebookAssistAction,
) {
  const body = note.body.trim();
  const title = note.title.trim() || "Untitled note";

  switch (action) {
    case "summarize":
      return `Summarize the following notebook note into a concise Markdown summary, preserving the most important facts and decisions.\n\nTitle: ${title}\n\n${body}`;
    case "rewrite":
      return `Rewrite the following notebook note to make it clearer and better structured while preserving its meaning. Return Markdown only.\n\nTitle: ${title}\n\n${body}`;
    case "expand":
      return `Expand the following notebook note with missing context, implied details, and clearer explanation. Keep it in Markdown and stay faithful to the original meaning.\n\nTitle: ${title}\n\n${body}`;
    case "checklist":
      return `Turn the following notebook note into a Markdown checklist. Preserve key details and convert clear actions into checklist items.\n\nTitle: ${title}\n\n${body}`;
    case "action_items":
      return `Extract action items from the following notebook note. Return a Markdown section with clear, concrete action bullets.\n\nTitle: ${title}\n\n${body}`;
  }
}
