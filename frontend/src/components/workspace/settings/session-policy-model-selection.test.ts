import assert from "node:assert/strict";
import test from "node:test";

const {
  DEFAULT_POLICY_MODEL_VALUE,
  getPolicyModelSelectValue,
  normalizePolicyModelName,
  normalizeSessionPolicyConfig,
} = await import(
  new URL("./session-policy-model-selection.ts", import.meta.url).href
);

void test("invalid session policy model names fall back to the default-model sentinel for selects", () => {
  const available = ["gpt-5.4", "gpt-4o-mini"];

  assert.equal(
    getPolicyModelSelectValue("claude-3-5-sonnet", available),
    DEFAULT_POLICY_MODEL_VALUE,
  );
  assert.equal(
    getPolicyModelSelectValue("gpt-5.4", available),
    "gpt-5.4",
  );
});

void test("normalizing session policy config clears deleted policy model references", () => {
  const normalized = normalizeSessionPolicyConfig(
    {
      title: { enabled: true, model_name: "claude-3-5-sonnet" },
      suggestions: { model_name: "claude-3-5-sonnet" },
      summarization: { enabled: true, model_name: "gpt-5.4" },
    },
    ["gpt-5.4"],
  );

  assert.deepEqual(normalized, {
    title: { enabled: true },
    summarization: { enabled: true, model_name: "gpt-5.4" },
  });
});

void test("normalizePolicyModelName keeps valid names and clears empty or missing ones", () => {
  assert.equal(normalizePolicyModelName("gpt-5.4", ["gpt-5.4"]), "gpt-5.4");
  assert.equal(normalizePolicyModelName(" claude ", ["gpt-5.4"]), "");
  assert.equal(normalizePolicyModelName("", ["gpt-5.4"]), "");
});
