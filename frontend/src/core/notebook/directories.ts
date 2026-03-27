import type { NotebookDirectoryEntry } from "./types";

export type NotebookDirectoryOption = {
  path: string;
  label: string;
  depth: number;
  isInbox: boolean;
  pathLabel: string;
};

type BuildNotebookDirectoryOptionsInput = {
  entries: NotebookDirectoryEntry[];
  includeInbox?: boolean;
  inboxLabel?: string;
  rootLabel?: string;
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
  includeInbox = false,
  inboxLabel = "Inbox",
  rootLabel = "Top level",
}: BuildNotebookDirectoryOptionsInput): NotebookDirectoryOption[] {
  const seen = new Set<string>();
  const options: NotebookDirectoryOption[] = [
    {
      path: "",
      label: rootLabel,
      depth: 0,
      isInbox: false,
      pathLabel: rootLabel,
    },
  ];

  seen.add("");

  if (includeInbox) {
    options.push({
      path: "inbox",
      label: inboxLabel,
      depth: 1,
      isInbox: true,
      pathLabel: inboxLabel,
    });
    seen.add("inbox");
  }

  for (const entry of [...entries].sort((left, right) => left.path.localeCompare(right.path))) {
    const path = entry.path.trim().replace(/^\/+|\/+$/g, "");
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    options.push({
      path,
      label: entry.name,
      depth: entry.depth,
      isInbox: false,
      pathLabel: formatNotebookDirectoryLabel(path),
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
  if (preferredDirectory !== undefined && preferredDirectory !== null && normalizedPreferred === "" && paths.has("")) {
    return "";
  }

  const currentDirectory = normalizeDirectory(parentDirectoryOfNote(selectedNotePath));
  if (currentDirectory && paths.has(currentDirectory)) {
    return currentDirectory;
  }
  if (selectedNotePath && currentDirectory === "" && paths.has("")) {
    return "";
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
