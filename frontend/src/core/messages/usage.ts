import type { Message } from "@/core/threads";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export function accumulateUsage(messages: Message[]): TokenUsage | null {
  const cumulative: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  let hasUsage = false;

  for (const message of messages) {
    if (message.type !== "ai") {
      continue;
    }

    const usage = ((message as unknown) as Record<string, unknown>)
      .usage_metadata as
      | { input_tokens?: number; output_tokens?: number; total_tokens?: number }
      | undefined;

    if (!usage) {
      continue;
    }

    hasUsage = true;
    cumulative.inputTokens += usage.input_tokens ?? 0;
    cumulative.outputTokens += usage.output_tokens ?? 0;
    cumulative.totalTokens += usage.total_tokens ?? 0;
  }

  return hasUsage ? cumulative : null;
}

export function formatTokenCount(count: number): string {
  if (count < 10_000) {
    return count.toLocaleString();
  }

  return `${(count / 1000).toFixed(1)}K`;
}
