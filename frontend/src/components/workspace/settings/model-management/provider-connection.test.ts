import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDraftProviderConnectionSignature,
  hasDraftProviderConnectionChanges,
  resolveDraftProviderApiKeySignatureValue,
  resolveDraftProviderExecutionMode,
  shouldUseDraftApiKeyValue,
  shouldHydratePersistedApiKeyForDraftExecution,
} from "./provider-connection.ts";

void test("buildDraftProviderConnectionSignature normalizes protocol, api base, and api key display", () => {
  assert.equal(
    buildDraftProviderConnectionSignature({
      protocol: " OpenAI-Compatible ",
      apiBase: " https://example.com/v1/ ",
      apiKeyDisplay: " sk-12********32v ",
    }),
    "openai-compatible|||https://example.com/v1|||sk-12********32v",
  );
});

void test("hasDraftProviderConnectionChanges stays false when the draft still matches the persisted signature", () => {
  const persistedSignature = buildDraftProviderConnectionSignature({
    protocol: "openai-compatible",
    apiBase: "https://example.com/v1",
    apiKeyDisplay: "sk-12********32v",
  });

  assert.equal(
    hasDraftProviderConnectionChanges({
      protocol: "openai-compatible",
      apiBase: "https://example.com/v1",
      apiKeyDisplay: "sk-12********32v",
      persistedSignature,
      apiKeyDirty: false,
    }),
    false,
  );
});

void test("hasDraftProviderConnectionChanges becomes true when api key is edited or connection fields change", () => {
  const persistedSignature = buildDraftProviderConnectionSignature({
    protocol: "openai-compatible",
    apiBase: "https://example.com/v1",
    apiKeyDisplay: "sk-12********32v",
  });

  assert.equal(
    hasDraftProviderConnectionChanges({
      protocol: "openai-compatible",
      apiBase: "https://example.com/v2",
      apiKeyDisplay: "sk-12********32v",
      persistedSignature,
      apiKeyDirty: false,
    }),
    true,
  );

  assert.equal(
    hasDraftProviderConnectionChanges({
      protocol: "openai-compatible",
      apiBase: "https://example.com/v1",
      apiKeyDisplay: "sk-live-abcdef",
      persistedSignature,
      apiKeyDirty: true,
    }),
    true,
  );
});

void test("resolveDraftProviderExecutionMode reuses persisted provider execution when the draft connection still matches", () => {
  const persistedSignature = buildDraftProviderConnectionSignature({
    protocol: "openai-compatible",
    apiBase: "https://example.com/v1",
    apiKeyDisplay: "sk-12********32v",
  });

  assert.equal(
    resolveDraftProviderExecutionMode({
      providerId: "provider-1",
      protocol: "openai-compatible",
      apiBase: "https://example.com/v1",
      apiKeyDisplay: "sk-12********32v",
      persistedSignature,
      apiKeyDirty: false,
    }),
    "persisted",
  );
});

void test("resolveDraftProviderExecutionMode falls back to draft execution when the connection changed", () => {
  const persistedSignature = buildDraftProviderConnectionSignature({
    protocol: "openai-compatible",
    apiBase: "https://example.com/v1",
    apiKeyDisplay: "sk-12********32v",
  });

  assert.equal(
    resolveDraftProviderExecutionMode({
      providerId: "provider-1",
      protocol: "openai-compatible",
      apiBase: "https://integrate.api.nvidia.com/v1",
      apiKeyDisplay: "••••",
      persistedSignature,
      apiKeyDirty: false,
    }),
    "draft",
  );
});

void test("shouldHydratePersistedApiKeyForDraftExecution only loads the saved secret when a persisted provider changed without a new api key", () => {
  assert.equal(
    shouldHydratePersistedApiKeyForDraftExecution({
      providerId: "provider-1",
      executionMode: "draft",
      apiKeyDirty: false,
      apiKeyPresent: true,
    }),
    true,
  );

  assert.equal(
    shouldHydratePersistedApiKeyForDraftExecution({
      providerId: "provider-1",
      executionMode: "draft",
      apiKeyDirty: true,
      apiKeyPresent: true,
    }),
    false,
  );

  assert.equal(
    shouldHydratePersistedApiKeyForDraftExecution({
      providerId: "provider-1",
      executionMode: "persisted",
      apiKeyDirty: false,
      apiKeyPresent: true,
    }),
    false,
  );

  assert.equal(
    shouldHydratePersistedApiKeyForDraftExecution({
      providerId: "",
      executionMode: "draft",
      apiKeyDirty: false,
      apiKeyPresent: true,
    }),
    false,
  );
});

void test("resolveDraftProviderApiKeySignatureValue keeps masked signatures stable until the user edits the key", () => {
  assert.equal(
    resolveDraftProviderApiKeySignatureValue({
      apiKey: "sk-live-secret",
      apiKeyMasked: "sk-li******ret",
      apiKeyLength: 14,
      apiKeyDirty: false,
    }),
    "sk-li******ret",
  );

  assert.equal(
    resolveDraftProviderApiKeySignatureValue({
      apiKey: "sk-live-secret",
      apiKeyMasked: "sk-li******ret",
      apiKeyLength: 14,
      apiKeyDirty: true,
    }),
    "sk-live-secret",
  );
});

void test("shouldUseDraftApiKeyValue only trusts the draft value when it is newly edited or differs from the masked placeholder", () => {
  assert.equal(
    shouldUseDraftApiKeyValue({
      apiKey: "sk-li******ret",
      apiKeyMasked: "sk-li******ret",
      apiKeyDirty: false,
    }),
    false,
  );

  assert.equal(
    shouldUseDraftApiKeyValue({
      apiKey: "sk-live-secret",
      apiKeyMasked: "sk-li******ret",
      apiKeyDirty: false,
    }),
    true,
  );

  assert.equal(
    shouldUseDraftApiKeyValue({
      apiKey: "sk-live-secret",
      apiKeyMasked: "sk-li******ret",
      apiKeyDirty: true,
    }),
    true,
  );
});
