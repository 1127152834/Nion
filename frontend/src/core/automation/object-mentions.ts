import type { NotebookDirectoryOption } from "../notebook/directories";

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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasInlineMention(text: string, mention: string) {
  const trimmed = text.trim();
  if (!trimmed || !mention) {
    return false;
  }
  return new RegExp(`(^|\\s)${escapeRegex(mention)}(?=\\s|$)`).test(trimmed);
}

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
