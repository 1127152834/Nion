import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { enUS } from "../../core/i18n/locales/en-US.ts";
import { zhCN } from "../../core/i18n/locales/zh-CN.ts";
import {
  pathOfProjects,
  pathOfNotebook,
  pathOfMemory,
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

void test("workspace route helpers expose notebook memory and project paths", () => {
  assert.equal(pathOfNotebook(), "/workspace/notebook");
  assert.equal(pathOfMemory(), "/workspace/memory");
  assert.equal(pathOfProjects(), "/workspace/projects");
});

void test("workspace menu and command palette expose notebook memory and project entry labels with target paths", async () => {
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

  for (const source of [navMenuSource, commandPaletteSource]) {
    assertSourceIncludesEntry(source, {
      labelRef: /t\.sidebar\.notebook/,
      pathRef: /pathOfNotebook/,
    });
    assertSourceIncludesEntry(source, {
      labelRef: /t\.sidebar\.memory/,
      pathRef: /pathOfMemory/,
    });
    assertSourceIncludesEntry(source, {
      labelRef: /t\.sidebar\.projects/,
      pathRef: /pathOfProjects|\/workspace\/projects/,
    });
  }

  assert.doesNotMatch(chatListSource, /t\.sidebar\.notebook/);
  assert.doesNotMatch(chatListSource, /t\.sidebar\.memory/);
  assert.doesNotMatch(chatListSource, /t\.sidebar\.projects/);
});

void test("workspace product copy keeps notebook and memory roles distinct", () => {
  assert.match(enUS.workspaceSurfaces.memory.description, /memory/i);
  assert.doesNotMatch(enUS.workspaceSurfaces.memory.description, /notebook/i);
  assert.match(zhCN.workspaceSurfaces.memory.description, /记忆/);
  assert.doesNotMatch(zhCN.workspaceSurfaces.memory.description, /笔记/);

  assert.doesNotMatch(enUS.notebookPage.description, /memory/i);
  assert.doesNotMatch(zhCN.notebookPage.description, /记忆/);

  assert.match(enUS.settings.sections.memory, /memory/i);
  assert.match(zhCN.settings.sections.memory, /记忆/);
});
