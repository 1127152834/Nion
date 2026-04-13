export function toggleInternalSummaryOpen(
  current: ReadonlySet<string>,
  summaryId: string,
): Set<string> {
  const next = new Set(current);
  if (next.has(summaryId)) {
    next.delete(summaryId);
  } else {
    next.add(summaryId);
  }
  return next;
}

export function getInternalSummaryItemId({
  groupId,
  messageId,
  index,
}: {
  groupId?: string;
  messageId?: string;
  index: number;
}) {
  return groupId ?? messageId ?? `internal-summary-${index}`;
}
