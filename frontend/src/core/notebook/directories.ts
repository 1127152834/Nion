import type { NotebookDirectoryEntry } from "./types";

export type NotebookDirectoryOption = {
  path: string;
  label: string;
  depth: number;
  isInbox: boolean;
};

type BuildNotebookDirectoryOptionsInput = {
  entries: NotebookDirectoryEntry[];
  inboxLabel?: string;
};

type FindDefaultNotebookDirectoryInput = {
  options: NotebookDirectoryOption[];
  preferredDirectory?: string | null;
  selectedNotePath?: string | null;
};

export function formatNotebookDirectoryLabel(path: string) {
  const cleaned = path.trim().replace(/^\/+|\/+$/g, "");
  if (!cleaned) {
    return "";
  }
  return cleaned.split("/").join(" / ");
}

export function buildNotebookDirectoryOptions({
  entries,
  inboxLabel = "Inbox",
}: BuildNotebookDirectoryOptionsInput): NotebookDirectoryOption[] {
  const seen = new Set<string>();
  const options: NotebookDirectoryOption[] = [
    {
      path: "inbox",
      label: inboxLabel,
      depth: 1,
      isInbox: true,
    },
  ];

  seen.add("inbox");

  for (const entry of [...entries].sort((left, right) => left.path.localeCompare(right.path))) {
    const path = entry.path.trim().replace(/^\/+|\/+$/g, "");
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    options.push({
      path,
      label: formatNotebookDirectoryLabel(path),
      depth: entry.depth,
      isInbox: false,
    });
  }

  return options;
}

export function findDefaultNotebookDirectory({
  options,
  preferredDirectory,
  selectedNotePath,
}: FindDefaultNotebookDirectoryInput) {
  const paths = new Set(options.map((option) => option.path));
  const normalizedPreferred = normalizeDirectory(preferredDirectory);
  if (normalizedPreferred && paths.has(normalizedPreferred)) {
    return normalizedPreferred;
  }

  const currentDirectory = normalizeDirectory(parentDirectoryOfNote(selectedNotePath));
  if (currentDirectory && paths.has(currentDirectory)) {
    return currentDirectory;
  }

  return paths.has("inbox") ? "inbox" : options[0]?.path ?? "";
}

function parentDirectoryOfNote(notePath?: string | null) {
  const normalized = normalizeDirectory(notePath);
  if (!normalized) {
    return "";
  }
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(0, slash) : "";
}

function normalizeDirectory(value?: string | null) {
  if (!value) {
    return "";
  }
  return value.trim().replace(/^\/+|\/+$/g, "");
}
