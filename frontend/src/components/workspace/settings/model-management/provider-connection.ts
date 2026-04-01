function normalizeProtocol(protocol: string): string {
  const normalized = protocol.trim().toLowerCase();
  if (normalized === "anthropic-compatible" || normalized === "anthropic") {
    return "anthropic-compatible";
  }
  return "openai-compatible";
}

function normalizeApiBase(apiBase: string): string {
  return apiBase.trim().replace(/\/+$/, "");
}

function normalizeApiKeyDisplay(apiKeyDisplay: string): string {
  return apiKeyDisplay.trim();
}

export function buildDraftProviderConnectionSignature(input: {
  protocol: string;
  apiBase: string;
  apiKeyDisplay: string;
}): string {
  return [
    normalizeProtocol(input.protocol),
    normalizeApiBase(input.apiBase),
    normalizeApiKeyDisplay(input.apiKeyDisplay),
  ].join("|||");
}

export function hasDraftProviderConnectionChanges(input: {
  protocol: string;
  apiBase: string;
  apiKeyDisplay: string;
  persistedSignature: string;
  apiKeyDirty: boolean;
}): boolean {
  if (input.apiKeyDirty) {
    return true;
  }

  return buildDraftProviderConnectionSignature({
    protocol: input.protocol,
    apiBase: input.apiBase,
    apiKeyDisplay: input.apiKeyDisplay,
  }) !== input.persistedSignature.trim();
}
