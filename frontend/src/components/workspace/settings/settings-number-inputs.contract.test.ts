import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sectionsUrl = new URL("./configuration/sections/", import.meta.url);

void test("settings numeric inputs serialize persisted numeric values before rendering", async () => {
  const cases = [
    {
      file: "summarization-section.tsx",
      patterns: [
        /toInputValue\(trigger\.value\)/,
        /toInputValue\(keep\.value\)/,
      ],
    },
    {
      file: "title-section.tsx",
      patterns: [
        /toInputValue\(title\.max_words\)/,
        /toInputValue\(title\.max_chars\)/,
      ],
    },
    {
      file: "sandbox-section.tsx",
      patterns: [
        /toInputValue\(sandbox\.port\)/,
        /toInputValue\(sandbox\.idle_timeout\)/,
      ],
    },
    {
      file: "attachments-section.tsx",
      patterns: [
        /toInputValue\(attachments\.max_files\)/,
        /toInputValue\(attachments\.max_file_size_mb\)/,
      ],
    },
    {
      file: "subagents-section.tsx",
      patterns: [
        /toInputValue\(item\.timeout_seconds\)/,
        /toInputValue\(subagents\.timeout_seconds\)/,
      ],
    },
    {
      file: "models-section.tsx",
      patterns: [
        /toInputValue\(model\.max_tokens\)/,
        /toInputValue\(model\.context_window\)/,
        /toInputValue\(model\.temperature\)/,
        /asOptionalNumber\(current\.max_tokens\)/,
        /asOptionalNumber\(current\.context_window\)/,
      ],
    },
  ] as const;

  for (const { file, patterns } of cases) {
    const source = await readFile(new URL(file, sectionsUrl), "utf8");
    for (const pattern of patterns) {
      assert.match(source, pattern, `${file} should match ${pattern}`);
    }
  }
});

void test("subagent settings choose names from session-policy registry options", async () => {
  const source = await readFile(
    new URL("./configuration/sections/subagents-section.tsx", import.meta.url),
    "utf8",
  );
  const configCenterApi = await readFile(
    new URL("../../../core/config-center/api.ts", import.meta.url),
    "utf8",
  );
  const configCenterHooks = await readFile(
    new URL("../../../core/config-center/hooks.ts", import.meta.url),
    "utf8",
  );

  assert.match(configCenterApi, /loadSessionPolicyOptions/);
  assert.match(configCenterApi, /\/api\/config\/session-policy\/options/);
  assert.match(configCenterHooks, /useSessionPolicyOptions/);
  assert.match(source, /useSessionPolicyOptions\(\)/);
  assert.match(source, /SelectItem/);
  assert.match(source, /unavailable/);
  assert.doesNotMatch(source, /<Input\s+value=\{name\}/);
});

void test("subagent settings addEntry appends object-shaped draft rows", async () => {
  const source = await readFile(
    new URL("./configuration/sections/subagents-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\{\s*name,\s*timeout:\s*"900"\s*\}/);
  assert.doesNotMatch(source, /\[name,\s*"900"\]/);
});
