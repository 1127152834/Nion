import type { NotebookDirectoryOption } from "../notebook/directories";
import { hasInlineMention } from "../utils/inline-mentions.ts";

export type ObjectMentionKind = "notebook-directory";

export type ObjectMention = {
  kind: "object";
  objectKind: ObjectMentionKind;
  value: string;
  mention: string;
  label: string;
  metadata?: Record<string, unknown>;
};

export type NotebookDirectoryMentionOption = {
  id: string;
  kind: "notebook-directory";
  objectKind: "notebook-directory";
  label: string;
  value: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export function buildNotebookDirectoryMentionOptions(
  options: NotebookDirectoryOption[],
): NotebookDirectoryMentionOption[] {
  return options
    .filter((option) => option.path)
    .map((option) => ({
      id: `notebook-directory:${option.path}`,
      kind: "notebook-directory",
      objectKind: "notebook-directory",
      label: option.label,
      value: option.path,
      description: option.pathLabel,
      metadata: {
        source: "notebook",
        depth: option.depth,
        isInbox: option.isInbox,
        pathLabel: option.pathLabel,
      },
    }));
}

export function buildNotebookDirectoryObjectMention(input: {
  value: string;
  label: string;
}): ObjectMention {
  return {
    kind: "object",
    objectKind: "notebook-directory",
    value: input.value,
    mention: `@${input.value}`,
    label: input.label,
    metadata: { source: "notebook" },
  };
}

export function buildObjectImplicitMentions({
  text,
  mentions,
}: {
  text: string;
  mentions: ObjectMention[];
}) {
  const seen = new Set<string>();

  return mentions.filter((mention) => {
    const key = `${mention.objectKind}:${mention.value}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return !hasInlineMention(text, mention.mention);
  });
}
