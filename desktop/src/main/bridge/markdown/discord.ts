export type DiscordChunk = {
  text: string;
};

const DISCORD_SOFT_LIMIT = 1900;

export function markdownToDiscordChunks(markdown: string, limit = 2000): DiscordChunk[] {
  if (!markdown) {
    return [];
  }
  if (markdown.length <= limit) {
    return [{ text: markdown }];
  }

  const softLimit = Math.min(limit - 100, DISCORD_SOFT_LIMIT);
  const lines = markdown.split("\n");
  const chunks: DiscordChunk[] = [];
  let currentLines: string[] = [];
  let currentLength = 0;
  let openFence: string | null = null;

  for (const line of lines) {
    const lineLength = line.length + 1;
    const fenceMatch = line.match(/^(`{3,})([\w]*)/);

    if (currentLength + lineLength > softLimit && currentLines.length > 0) {
      let chunkText = currentLines.join("\n");
      if (openFence) {
        chunkText += "\n```";
      }
      chunks.push({ text: chunkText });
      currentLines = [];
      currentLength = 0;
      if (openFence) {
        currentLines.push(openFence);
        currentLength = openFence.length + 1;
      }
    }

    currentLines.push(line);
    currentLength += lineLength;

    if (fenceMatch) {
      openFence = openFence ? null : fenceMatch[0];
    }
  }

  if (currentLines.length > 0) {
    let chunkText = currentLines.join("\n");
    if (openFence) {
      chunkText += "\n```";
    }
    chunks.push({ text: chunkText });
  }

  const result: DiscordChunk[] = [];
  for (const chunk of chunks) {
    if (chunk.text.length <= limit) {
      result.push(chunk);
      continue;
    }
    let remaining = chunk.text;
    while (remaining.length > limit) {
      result.push({ text: remaining.slice(0, limit) });
      remaining = remaining.slice(limit);
    }
    if (remaining) {
      result.push({ text: remaining });
    }
  }
  return result;
}
