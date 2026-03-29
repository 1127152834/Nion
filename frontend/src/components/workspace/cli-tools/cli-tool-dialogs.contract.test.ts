import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("catalog tool detail dialog keeps external links and try/install affordances", async () => {
  const source = await readFile(
    new URL("./cli-tool-detail-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /tool\.homepage \|\| tool\.repoUrl \|\| tool\.officialDocsUrl/);
  assert.match(source, /GitHub/);
  assert.match(source, /Homepage|主页/);
  assert.match(source, /Docs|文档/);
  assert.match(source, /Try It|试一试/);
  assert.match(source, /Install|安装/);
  assert.match(source, /pathOfNewThread/);
});

void test("extra tool detail dialog keeps runtime info and no-description fallback", async () => {
  const source = await readFile(
    new URL("./cli-tool-extra-detail-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Tool info|工具信息/);
  assert.match(source, /Version|版本/);
  assert.match(source, /Path|路径/);
  assert.match(source, /No AI description yet\.|还没有 AI 描述。/);
  assert.match(source, /Try It|试一试/);
  assert.match(source, /pathOfNewThread/);
});

void test("tool card keeps category badges and install method picker", async () => {
  const source = await readFile(
    new URL("./cli-tool-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /CATEGORY_LABELS/);
  assert.match(source, /variant === "installed" && runtimeInfo\?\.version/);
  assert.match(source, /availableMethods\.length > 1/);
  assert.match(source, /onInstall\(tool, method\.method\)/);
});
