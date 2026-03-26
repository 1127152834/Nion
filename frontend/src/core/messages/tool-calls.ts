export function getTaskToolCallIds(
  toolCalls: Array<{ name?: string; id?: string | null }> | undefined,
): string[] {
  return (toolCalls ?? [])
    .filter((toolCall) => toolCall.name === "task" && Boolean(toolCall.id))
    .map((toolCall) => toolCall.id as string);
}
