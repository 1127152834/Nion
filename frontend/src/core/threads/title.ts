const UNTITLED_TITLE = "Untitled";

export function normalizeThreadTitleCandidate(title: string | null | undefined) {
  if (typeof title !== "string") {
    return null;
  }

  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isPlaceholderThreadTitle(title: string | null | undefined) {
  const normalized = normalizeThreadTitleCandidate(title);
  return normalized == null || normalized === UNTITLED_TITLE;
}

export function resolvePreferredThreadTitle(options: {
  currentTitle?: string | null | undefined;
  incomingTitle?: string | null | undefined;
}) {
  const currentTitle = normalizeThreadTitleCandidate(options.currentTitle);
  const incomingTitle = normalizeThreadTitleCandidate(options.incomingTitle);

  if (incomingTitle == null) {
    return currentTitle;
  }

  if (isPlaceholderThreadTitle(incomingTitle) && !isPlaceholderThreadTitle(currentTitle)) {
    return currentTitle;
  }

  return incomingTitle;
}
