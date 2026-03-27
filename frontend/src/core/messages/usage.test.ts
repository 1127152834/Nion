import assert from "node:assert/strict";
import test from "node:test";

import { accumulateUsage, formatTokenCount } from "./usage.ts";

void test("accumulateUsage sums usage_metadata across ai messages", () => {
  const usage = accumulateUsage([
    {
      type: "ai",
      usage_metadata: {
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
      },
    },
    { type: "tool" },
    {
      type: "ai",
      usage_metadata: {
        input_tokens: 200,
        output_tokens: 25,
        total_tokens: 225,
      },
    },
  ] as never[]);

  assert.deepEqual(usage, {
    inputTokens: 300,
    outputTokens: 75,
    totalTokens: 375,
  });
});

void test("formatTokenCount uses compact display at 10k+", () => {
  assert.equal(formatTokenCount(12345), "12.3K");
});
