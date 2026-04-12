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

export type DraftProviderExecutionMode = "persisted" | "draft";

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

export function resolveDraftProviderApiKeySignatureValue(input: {
  apiKey: string;
  apiKeyMasked: string;
  apiKeyLength?: number | null;
  apiKeyDirty: boolean;
}): string {
  const current = normalizeApiKeyDisplay(input.apiKey);
  const masked = normalizeApiKeyDisplay(input.apiKeyMasked);

  if (input.apiKeyDirty) {
    return current;
  }
  if (masked) {
    return masked;
  }
  if (typeof input.apiKeyLength === "number" && Number.isFinite(input.apiKeyLength) && input.apiKeyLength > 0) {
    return "•".repeat(input.apiKeyLength);
  }
  return current;
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

export function resolveDraftProviderExecutionMode(input: {
  providerId: string;
  protocol: string;
  apiBase: string;
  apiKeyDisplay: string;
  persistedSignature: string;
  apiKeyDirty: boolean;
}): DraftProviderExecutionMode {
  if (!input.providerId.trim()) {
    return "draft";
  }

  return hasDraftProviderConnectionChanges(input) ? "draft" : "persisted";
}

export function shouldHydratePersistedApiKeyForDraftExecution(input: {
  providerId: string;
  executionMode: DraftProviderExecutionMode;
  apiKeyDirty: boolean;
  apiKeyPresent: boolean;
}): boolean {
  if (input.executionMode !== "draft") {
    return false;
  }
  if (!input.providerId.trim()) {
    return false;
  }
  if (input.apiKeyDirty) {
    return false;
  }
  return input.apiKeyPresent;
}

export function shouldUseDraftApiKeyValue(input: {
  apiKey: string;
  apiKeyMasked: string;
  apiKeyDirty: boolean;
}): boolean {
  const current = normalizeApiKeyDisplay(input.apiKey);
  if (!current) {
    return false;
  }
  if (input.apiKeyDirty) {
    return true;
  }
  const masked = normalizeApiKeyDisplay(input.apiKeyMasked);
  if (!masked) {
    return true;
  }
  return current !== masked;
}
