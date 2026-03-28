import assert from "node:assert/strict";
import test from "node:test";

const { enUS } = await import(
  new URL("../../../core/i18n/locales/en-US.ts", import.meta.url).href,
);
const { buildAgentIntegrationsCopy } = await import(
  new URL("./agent-integrations-settings-page.copy.ts", import.meta.url).href,
);

void test("buildAgentIntegrationsCopy exposes the known ACP adapter catalog", () => {
  const copy = buildAgentIntegrationsCopy(enUS.settings.agentIntegrations);

  assert.equal(copy.catalog.codex.commandDefault, "npx");
  assert.deepEqual(copy.catalog.codex.argsDefault, [
    "-y",
    "@zed-industries/codex-acp",
  ]);
  assert.equal(copy.catalog.claudeCode.commandDefault, "npx");
  assert.deepEqual(copy.catalog.claudeCode.argsDefault, [
    "-y",
    "@zed-industries/claude-agent-acp",
  ]);
});
