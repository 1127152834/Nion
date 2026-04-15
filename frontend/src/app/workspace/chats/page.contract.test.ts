import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("chat list page exposes the same lightweight multi-select delete mode", async () => {
  const source = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

  assert.match(source, /selectionMode/);
  assert.match(source, /selectedThreadIds/);
  assert.match(source, /toggleThreadSelection/);
  assert.match(source, /handleDeleteSelected/);
  assert.match(source, /t\.common\.select/);
  assert.match(source, /t\.common\.cancel/);
  assert.match(source, /t\.common\.delete/);
  assert.match(source, /t\.chats\.selectedCount/);
  assert.match(source, /handleSelectAll/);
  assert.match(source, /t\.common\.selectAll/);
  assert.match(source, /searchParams\.get\("type"\)/);
  assert.match(source, /groupThreadsByWorkspaceType/);
  assert.match(source, /ThreadTypeTabs/);
  assert.match(source, /scope="page"/);
  assert.match(source, /WorkspaceThreadListItem/);
  assert.match(
    source,
    /pathOfThread\(remainingThreads\[0\]\?\.thread\.thread_id \?\? "new", \{\s*type:/,
  );
});

void test("chat thread page exposes a desktop drag region while keeping toolbar actions clickable", async () => {
  const source = await readFile(
    new URL("./chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useIsDesktopShell/);
  assert.match(
    source,
    /data-desktop-drag-region=\{[\s\S]*isDesktopShell \? "chat-thread-header" : undefined[\s\S]*\}/,
  );
  assert.match(source, /\[-webkit-app-region:drag\]/);
  assert.match(
    source,
    /data-desktop-no-drag=\{[\s\S]*isDesktopShell \? "chat-thread-actions" : undefined[\s\S]*\}/,
  );
  assert.match(source, /WorkingDirectoryTrigger/);
  assert.match(source, /ExportTrigger/);
  assert.match(source, /SaveToNotebookTrigger/);
});

void test("chat thread page redirects host-mode setup to sandbox settings when no default host workdir is configured", async () => {
  const source = await readFile(
    new URL("./chat-thread-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /hostWorkdirMissingTitle/);
  assert.match(source, /hostWorkdirMissingDescription/);
  assert.match(source, /ConfirmActionDialog/);
  assert.match(source, /hostWorkdirPromptOpen/);
  assert.match(source, /function openSandboxSettings/);
  assert.match(source, /new CustomEvent\("nion-open-settings"/);
  assert.match(source, /openSandboxSettings\(\)/);
  assert.match(source, /hostWorkdirMissingAction/);
  assert.doesNotMatch(source, /confirmText=\{t\.common\.ok\}/);
});
