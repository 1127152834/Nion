import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("CLI tools manager keeps installed and recommended sections", async () => {
  const source = await readFile(new URL("./cli-tools-manager.tsx", import.meta.url), "utf8");

  assert.match(source, /已安装|Installed/);
  assert.match(source, /推荐工具|Recommended/);
  assert.match(source, /installedActions/);
  assert.match(source, /emptyAction/);
  assert.match(source, /title\?/);
  assert.match(source, /description\?/);
});

void test("CLI install dialog keeps streamed install phases", async () => {
  const source = await readFile(new URL("./cli-tool-install-dialog.tsx", import.meta.url), "utf8");

  assert.match(source, /type Phase = "running" \| "success" \| "error"/);
  assert.match(source, /response\.body\.getReader\(\)/);
  assert.match(source, /new TextDecoder\(\)/);
  assert.match(source, /line\.startsWith\("event: "\)/);
  assert.match(source, /currentEvent === "output"/);
  assert.match(source, /currentEvent === "done"/);
  assert.match(source, /currentEvent === "error"/);
  assert.match(source, /正在安装|Installing/);
  assert.match(source, /安装成功|Install successful/);
  assert.match(source, /安装失败|Install failed/);
});

void test("CLI composer popover keeps manage-tools affordance", async () => {
  const source = await readFile(new URL("../input-box.tsx", import.meta.url), "utf8");

  assert.match(source, /Manage CLI tools/);
  assert.match(source, /Go install CLI tools/);
  assert.match(source, /new CustomEvent\("nion-open-settings"/);
  assert.match(source, /detail: \{ section: "cliTools" \}/);
  assert.match(source, /tool\.displayName\?\.trim\(\) \|\| toolId/);
  assert.match(source, /tool\.version/);
});
