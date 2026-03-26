import type { BaseBridgeAdapter, BridgeOutboundMessage } from "./base-adapter.js";
import { markdownToDiscordChunks } from "./markdown/discord.js";
import { renderTelegramHtml } from "./markdown/telegram.js";
import { BridgeChatRateLimiter } from "./security/rate-limiter.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;
const INTER_CHUNK_DELAY_MS = 300;

const rateLimiter = new BridgeChatRateLimiter();

export const BRIDGE_PLATFORM_LIMITS: Record<string, number> = {
  telegram: 4096,
  discord: 2000,
  qq: 2000,
  weixin: 4096,
  feishu: 6000,
};

setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60_000);

export function chunkBridgeText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex <= 0 || splitIndex < maxLength * 0.5) {
      splitIndex = maxLength;
    }
    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).replace(/^\n/, "");
  }
  return chunks;
}

function classifyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|rate limit|too many requests/i.test(message)) {
    return "rate_limit";
  }
  if (/5\d\d|server error/i.test(message)) {
    return "server_error";
  }
  if (/4\d\d|bad request|not found|missing access/i.test(message)) {
    return "client_error";
  }
  return "network";
}

async function sendWithRetry(adapter: BaseBridgeAdapter, message: BridgeOutboundMessage) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      await adapter.send(message);
      return;
    } catch (error) {
      lastError = error;
      const category = classifyError(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (category === "client_error" && message.parseMode === "HTML" && /parse|entity|html/i.test(errorMessage)) {
        await adapter.send({
          ...message,
          text: message.text.replace(/<[^>]+>/g, ""),
          parseMode: "plain",
        });
        return;
      }
      if (category === "client_error") {
        throw error;
      }
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = BASE_DELAY_MS * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function deliverBridgeMessage(
  adapter: BaseBridgeAdapter,
  message: BridgeOutboundMessage,
) {
  const limit = BRIDGE_PLATFORM_LIMITS[adapter.platform] ?? 4096;
  const renderAsTelegramHtml =
    adapter.platform === "telegram" &&
    !message.inlineButtons &&
    message.text.length <= limit;
  const chunks =
    adapter.platform === "discord"
      ? markdownToDiscordChunks(message.text, limit).map((item) => item.text)
      : chunkBridgeText(message.text, limit);
  for (let index = 0; index < chunks.length; index += 1) {
    await rateLimiter.acquire(message.chatId);
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, INTER_CHUNK_DELAY_MS));
    }
    await sendWithRetry(adapter, {
      ...message,
      text: renderAsTelegramHtml ? renderTelegramHtml(chunks[index]) : chunks[index],
      ...(renderAsTelegramHtml ? { parseMode: "HTML" as const } : {}),
      ...(index === 0
        ? {}
        : {
            replyToMessageId: adapter.platform === "qq" ? message.replyToMessageId : undefined,
            inlineButtons: undefined,
          }),
    });
  }
}
