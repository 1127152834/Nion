import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { zhCN } = await import(
  new URL("../../../core/i18n/locales/zh-CN.ts", import.meta.url).href,
);

void test("中文设置导航使用更短的工具与集成标签", () => {
  assert.equal(zhCN.settings.sections.cliTools, "CLI");
  assert.equal(zhCN.settings.sections.agentIntegrations, "集成");
  assert.equal(zhCN.settings.sections.mcpServers, "MCP");
});

void test("中文设置错误文案不暴露配置中心内部实现语义", () => {
  assert.notEqual(zhCN.settings.configCenterError, "配置中心当前不可用。");
});

void test("settings dialog header does not prioritize config-center error copy", async () => {
  const source = await readFile(
    new URL("./settings-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /configError\s*\?\s*t\.settings\.configCenterError/);
});
