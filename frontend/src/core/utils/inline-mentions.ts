export type InlineMentionTrigger = "@" | "/";

export type InlineMentionState = {
  trigger: InlineMentionTrigger;
  query: string;
  start: number;
  end: number;
};

export type InlineMentionBackspaceDeleteResult = {
  trigger: InlineMentionTrigger;
  value: string;
  nextValue: string;
  nextCaret: number;
};

function isMentionBoundary(char: string | undefined) {
  return !char || /\s/.test(char);
}

export function hasInlineMention(text: string, mention: string) {
  const trimmed = text.trim();
  if (!trimmed || !mention) {
    return false;
  }
  return new RegExp(
    `(^|\\s)${mention.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`,
  ).test(trimmed);
}

export function resolveInlineMentionState(
  value: string,
  caret: number,
): InlineMentionState | null {
  const safeCaret = Math.max(0, Math.min(caret, value.length));
  if (safeCaret <= 0) {
    return null;
  }

  let triggerIndex = -1;
  let trigger: InlineMentionTrigger | null = null;
  for (let index = safeCaret - 1; index >= 0; index -= 1) {
    const char = value.charAt(index);
    if (char === " " || char === "\n") {
      break;
    }
    if (char === "@" || char === "/") {
      triggerIndex = index;
      trigger = char as InlineMentionTrigger;
      break;
    }
  }

  if (triggerIndex === -1 || !trigger) {
    return null;
  }

  return {
    trigger,
    query: value.slice(triggerIndex + 1, safeCaret),
    start: triggerIndex,
    end: safeCaret,
  };
}

export function resolveInlineMentionBackspaceDelete(
  value: string,
  caret: number,
): InlineMentionBackspaceDeleteResult | null {
  const safeCaret = Math.max(0, Math.min(caret, value.length));
  if (safeCaret <= 0) {
    return null;
  }

  let rangeEnd = safeCaret;
  if (value.charAt(safeCaret - 1) === " ") {
    rangeEnd = safeCaret - 1;
  }

  if (rangeEnd <= 0) {
    return null;
  }

  let start = rangeEnd - 1;
  while (start >= 0) {
    const char = value.charAt(start);
    if (char === "@" || char === "/") {
      break;
    }
    if (/\s/.test(char)) {
      return null;
    }
    start -= 1;
  }

  if (start < 0) {
    return null;
  }

  const trigger = value.charAt(start);
  if ((trigger !== "@" && trigger !== "/") || !isMentionBoundary(value.charAt(start - 1))) {
    return null;
  }

  const mentionValue = value.slice(start + 1, rangeEnd);
  if (!mentionValue) {
    return null;
  }

  const hasTrailingSpace = value.charAt(rangeEnd) === " ";
  const deleteEnd = hasTrailingSpace ? rangeEnd + 1 : rangeEnd;
  return {
    trigger: trigger as InlineMentionTrigger,
    value: mentionValue,
    nextValue: `${value.slice(0, start)}${value.slice(deleteEnd)}`,
    nextCaret: start,
  };
}
