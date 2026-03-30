import type { NotebookPendingRewrite } from "./types.ts";

export function mergePendingRewriteWithInitial(
  initialPendingRewrite: NotebookPendingRewrite | null,
  currentPendingRewrite: NotebookPendingRewrite | null,
) {
  if (initialPendingRewrite === currentPendingRewrite) {
    return currentPendingRewrite;
  }
  if (initialPendingRewrite !== null) {
    return initialPendingRewrite;
  }
  return null;
}
