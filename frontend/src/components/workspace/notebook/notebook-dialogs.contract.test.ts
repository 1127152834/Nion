import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("Notebook dialogs match the reference create / quick capture / delete structures", async () => {
  const createSource = await readFile(new URL("./notebook-create-dialog.tsx", import.meta.url), "utf8");
  const quickSource = await readFile(new URL("./notebook-quick-capture-dialog.tsx", import.meta.url), "utf8");
  const deleteSource = await readFile(new URL("./notebook-delete-dialog.tsx", import.meta.url), "utf8");

  assert.match(createSource, /saveToLabel/);
  assert.match(createSource, /FileText/);
  assert.match(createSource, /NotebookDialogShell/);
  assert.match(createSource, /NotebookFolderPicker/);
  assert.doesNotMatch(createSource, /目录，例如 projects\/alpha|Directory, e\.g\. projects\/alpha/);
  assert.match(quickSource, /Cmd\+Enter|Ctrl\+Enter/);
  assert.match(quickSource, /Zap|Sparkles/);
  assert.match(quickSource, /NotebookDialogShell/);
  assert.match(quickSource, /收件箱|Inbox/);
  assert.match(deleteSource, /NotebookDialogShell/);
  assert.match(deleteSource, /AlertTriangle/);
  assert.match(deleteSource, /恢复/);
  assert.match(deleteSource, /summary|content|路径/);
});

void test("SaveToNotebookTrigger stays notebook-only and seeds notebook create flow", async () => {
  const triggerSource = await readFile(new URL("../save-to-notebook-trigger.tsx", import.meta.url), "utf8");
  const pageSource = await readFile(new URL("./notebook-page.tsx", import.meta.url), "utf8");

  assert.match(triggerSource, /saveFromChat/);
  assert.match(triggerSource, /pathOfNotebookSeededCreate/);
  assert.match(triggerSource, /source:\s*"chat"/);
  assert.match(triggerSource, /capture:\s*"thread"/);
  assert.match(triggerSource, /capture:\s*"reply"/);
  assert.doesNotMatch(triggerSource, /project|memory/i);
  assert.match(pageSource, /searchParams\.get\("title"\)/);
  assert.match(pageSource, /searchParams\.get\("body"\)/);
  assert.match(pageSource, /searchParams\.get\("directory"\)/);
  assert.match(pageSource, /searchParams\.get\("source"\)/);
  assert.match(pageSource, /searchParams\.get\("capture"\)/);
});
