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

function assertSourceIncludesEntry(
  source: string,
  options: {
    labelRef: RegExp;
    pathRef: RegExp;
  },
) {
  assert.match(source, options.labelRef);
  assert.match(source, options.pathRef);
}

void test("workspace route helpers expose separate notebook memory self-maintenance and project paths", () => {
  assert.equal(pathOfNotebook(), "/workspace/notebook");
  assert.equal(pathOfMemory(), "/workspace/memory");
  assert.equal(pathOfSelfMaintenance(), "/workspace/self-maintenance");
  assert.equal(pathOfProjects(), "/workspace/projects");
});

void test("workspace navigation sources expose notebook memory self-maintenance and project entry labels with target paths", async () => {
  const chatListSource = await readFile(
    new URL("./workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );
  const navMenuSource = await readFile(
    new URL("./workspace-nav-menu.tsx", import.meta.url),
    "utf8",
  );
  const commandPaletteSource = await readFile(
    new URL("./command-palette.tsx", import.meta.url),
    "utf8",
  );

  for (const source of [chatListSource, navMenuSource, commandPaletteSource]) {
    assertSourceIncludesEntry(source, {
      labelRef: /t\.sidebar\.notebook/,
      pathRef: /pathOfNotebook/,
    });
    assertSourceIncludesEntry(source, {
      labelRef: /t\.sidebar\.memory/,
      pathRef: /pathOfMemory/,
    });
    assertSourceIncludesEntry(source, {
      labelRef: /t\.sidebar\.selfMaintenance/,
      pathRef: /pathOfSelfMaintenance/,
    });
    assertSourceIncludesEntry(source, {
      labelRef: /t\.sidebar\.projects/,
      pathRef: /pathOfProjects|\/workspace\/projects/,
    });
  }
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
