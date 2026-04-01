import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDraftProviderConnectionSignature,
  hasDraftProviderConnectionChanges,
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
