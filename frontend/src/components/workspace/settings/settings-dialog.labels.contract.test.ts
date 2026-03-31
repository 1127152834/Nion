import assert from "node:assert/strict";
import test from "node:test";

const { zhCN } = await import(
  new URL("../../../core/i18n/locales/zh-CN.ts", import.meta.url).href,
);

void test("中文设置导航使用更短的工具与集成标签", () => {
  assert.equal(zhCN.settings.sections.cliTools, "CLI");
  assert.equal(zhCN.settings.sections.agentIntegrations, "集成");
  assert.equal(zhCN.settings.sections.mcpServers, "MCP");
});
