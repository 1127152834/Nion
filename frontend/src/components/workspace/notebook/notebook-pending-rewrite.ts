import type { NotebookPendingRewrite } from "../../../core/notebook/types.ts";

interface ApplyNotebookPendingRewriteInput {
  currentBody: string;
  nextContent: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  existingPendingRewrite?: NotebookPendingRewrite | null;
}

function replaceSelection(
  body: string,
  content: string,
  selectionStart?: number | null,
  selectionEnd?: number | null,
) {
  if (selectionStart == null || selectionEnd == null) {
    return content;
  }
  const start = Math.max(0, selectionStart);
  const end = Math.min(body.length, selectionEnd);
  return `${body.slice(0, start)}${content}${body.slice(end)}`;
}

export function applyNotebookPendingRewrite(
  input: ApplyNotebookPendingRewriteInput,
): NotebookPendingRewrite {
  const originalContent = input.existingPendingRewrite?.original_content ?? input.currentBody;
  return {
    original_content: originalContent,
    applied_content: replaceSelection(
      originalContent,
      input.nextContent,
      input.selectionStart,
      input.selectionEnd,
    ),
    selection_start: input.selectionStart ?? null,
    selection_end: input.selectionEnd ?? null,
  };
}

export function cancelNotebookPendingRewrite(pendingRewrite: NotebookPendingRewrite) {
  return pendingRewrite.original_content;
}

export function confirmNotebookPendingRewrite(pendingRewrite: NotebookPendingRewrite) {
  return pendingRewrite.applied_content;
}
