import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { enUS } from "../../core/i18n/locales/en-US.ts";
import { zhCN } from "../../core/i18n/locales/zh-CN.ts";
import {
  pathOfProjects,
  pathOfNotebook,
  pathOfMemory,
  pathOfSelfMaintenance,
} from "../../core/navigation/desktop-routes.ts";

void test("workspace navigation exposes separate notebook memory and self-maintenance entry points", async () => {
  const source = await readFile(
    new URL("./workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(pathOfNotebook(), "/workspace/notebook");
  assert.equal(pathOfMemory(), "/workspace/memory");
  assert.equal(pathOfSelfMaintenance(), "/workspace/self-maintenance");
  assert.match(source, /const notebookPath = pathOfNotebook\(\)/);
  assert.match(source, /const memoryPath = pathOfMemory\(\)/);
  assert.match(source, /const selfMaintenancePath = pathOfSelfMaintenance\(\)/);
  assert.match(source, /href=\{notebookPath\}/);
  assert.match(source, /href=\{memoryPath\}/);
  assert.match(source, /href=\{selfMaintenancePath\}/);
  assert.match(source, /t\.sidebar\.memory/);
  assert.match(source, /t\.sidebar\.selfMaintenance/);
});

void test("workspace nav menu exposes product-surface links for notebook memory self-maintenance and projects", async () => {
  const source = await readFile(
    new URL("./workspace-nav-menu.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(pathOfProjects(), "/workspace/projects");
  assert.match(source, /pathOfNotebook/);
  assert.match(source, /pathOfMemory/);
  assert.match(source, /pathOfSelfMaintenance/);
  assert.match(source, /pathOfProjects/);
  assert.match(source, /router\.push\(notebookPath\)/);
  assert.match(source, /router\.push\(memoryPath\)/);
  assert.match(source, /router\.push\(selfMaintenancePath\)/);
  assert.match(source, /router\.push\(projectsPath\)/);
  assert.match(source, /t\.sidebar\.notebook/);
  assert.match(source, /t\.sidebar\.memory/);
  assert.match(source, /t\.sidebar\.selfMaintenance/);
  assert.match(source, /t\.sidebar\.projects/);
});

void test("command palette exposes direct product-surface navigation actions", async () => {
  const source = await readFile(
    new URL("./command-palette.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /pathOfNotebook/);
  assert.match(source, /pathOfMemory/);
  assert.match(source, /pathOfSelfMaintenance/);
  assert.match(source, /pathOfProjects/);
  assert.match(source, /router\.push\(notebookPath\)/);
  assert.match(source, /router\.push\(memoryPath\)/);
  assert.match(source, /router\.push\(selfMaintenancePath\)/);
  assert.match(source, /router\.push\(projectsPath\)/);
  assert.match(source, /t\.sidebar\.notebook/);
  assert.match(source, /t\.sidebar\.memory/);
  assert.match(source, /t\.sidebar\.selfMaintenance/);
  assert.match(source, /t\.sidebar\.projects/);
});

void test("workspace product copy keeps notebook memory self-maintenance and OpenViking roles distinct", () => {
  assert.match(enUS.workspaceSurfaces.memory.description, /memory/i);
  assert.doesNotMatch(enUS.workspaceSurfaces.memory.description, /notebook/i);
  assert.match(zhCN.workspaceSurfaces.memory.description, /记忆/);
  assert.doesNotMatch(zhCN.workspaceSurfaces.memory.description, /笔记/);

  assert.match(enUS.workspaceSurfaces.selfMaintenance.description, /agent-owned/i);
  assert.match(zhCN.workspaceSurfaces.selfMaintenance.description, /智能体/);
  assert.match(zhCN.workspaceSurfaces.selfMaintenance.description, /自我维护|维护/);

  assert.doesNotMatch(enUS.notebookPage.description, /memory/i);
  assert.doesNotMatch(zhCN.notebookPage.description, /记忆/);

  assert.match(enUS.settings.sections.memory, /memory/i);
  assert.doesNotMatch(enUS.settings.sections.memory, /OpenViking/i);
  assert.match(zhCN.settings.sections.memory, /记忆/);
  assert.doesNotMatch(zhCN.settings.sections.memory, /OpenViking/);

  assert.match(enUS.settings.memory.openviking.title, /OpenViking/i);
  assert.match(
    enUS.settings.memory.openviking.description,
    /embedded|backend mode/i,
  );
  assert.match(zhCN.settings.memory.openviking.title, /OpenViking/);
  assert.match(
    zhCN.settings.memory.openviking.description,
    /嵌入式|后端模式/,
  );
});
