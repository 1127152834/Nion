import type { NotebookNote, NotebookSelection } from "./types";

export type NotebookAssistAction =
  | "summarize"
  | "rewrite"
  | "expand"
  | "checklist"
  | "action_items";

export function buildNotebookAssistPrompt(
  note: Pick<NotebookNote, "title" | "body">,
  action: NotebookAssistAction,
  options?: {
    selection?: NotebookSelection | null;
    sourceLabel?: string;
    referenceBody?: string | null;
  },
) {
  const body = note.body.trim();
  const title = note.title.trim() || "Untitled note";
  const selectedText = options?.selection?.text?.trim() ?? "";
  const useSelection = Boolean(
    selectedText && (action === "rewrite" || action === "expand"),
  );
  const sourceLabel = options?.sourceLabel?.trim();
  const referenceBody = options?.referenceBody?.trim() ?? "";
  const scopePreamble = useSelection
    ? `Use the selected excerpt as the primary scope.\n\nSelected excerpt:\n${selectedText}\n\nFull note for reference:\n${body}`
    : sourceLabel
      ? `${sourceLabel}:\n${body}${referenceBody ? `\n\nReference note:\n${referenceBody}` : ""}`
      : body;

  switch (action) {
    case "summarize":
      return `Summarize the following notebook note into a concise Markdown summary, preserving the most important facts and decisions.\n\nTitle: ${title}\n\n${body}`;
    case "rewrite":
      return `Rewrite the following notebook note to make it clearer and better structured while preserving its meaning. Return Markdown only.\n\nTitle: ${title}\n\n${scopePreamble}`;
    case "expand":
      return `Expand the following notebook note with missing context, implied details, and clearer explanation. Keep it in Markdown and stay faithful to the original meaning.\n\nTitle: ${title}\n\n${scopePreamble}`;
    case "checklist":
      return `Turn the following notebook note into a Markdown checklist. Preserve key details and convert clear actions into checklist items.\n\nTitle: ${title}\n\n${body}`;
    case "action_items":
      return `Extract action items from the following notebook note. Return a Markdown section with clear, concrete action bullets.\n\nTitle: ${title}\n\n${body}`;
  }
}
