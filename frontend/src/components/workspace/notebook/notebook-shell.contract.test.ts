import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookPage becomes a shell controller that renders extracted notebook panes", async () => {
  const pageSource = await readFile(new URL("./notebook-page.tsx", import.meta.url), "utf8");
  const sidebarSource = await readFile(
    new URL("./notebook-sidebar.tsx", import.meta.url),
    "utf8",
  );
  const editorPaneSource = await readFile(
    new URL("./notebook-editor-pane.tsx", import.meta.url),
    "utf8",
  );
  const contextPanelSource = await readFile(
    new URL("./notebook-context-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /notebookThemeStyle/);
  assert.match(pageSource, /leftRailCollapsed/);
  assert.match(pageSource, /rightRailCollapsed/);
  assert.match(pageSource, /gridTemplateColumns/);
  assert.match(pageSource, /from "\.\/notebook-sidebar"/);
  assert.match(pageSource, /from "\.\/notebook-editor-pane"/);
  assert.match(pageSource, /from "\.\/notebook-context-panel"/);
  assert.match(pageSource, /<NotebookSidebar[\s\S]*treeNodes=\{treeNodes\}/);
  assert.match(pageSource, /useNotebookInbox/);
  assert.match(pageSource, /NotebookInboxPanel/);
  assert.match(pageSource, /inboxItems=\{inboxItems\}/);
  assert.match(pageSource, /<NotebookEditorPane[\s\S]*draftBody=\{draftBody\}/);
  assert.match(pageSource, /<NotebookEditorPane[\s\S]*onSelectionChange=/);
  assert.match(pageSource, /<NotebookContextPanel[\s\S]*notebookAssistantSessionId=\{notebookAssistantSessionId\}/);
  assert.match(pageSource, /<NotebookContextPanel[\s\S]*onStartNewConversation=\{startNotebookAssistantConversation\}/);
  assert.doesNotMatch(pageSource, /treeNodes\.map/);
  assert.doesNotMatch(pageSource, /NotebookTreeItem/);
  assert.match(sidebarSource, /export function NotebookSidebar/);
  assert.match(editorPaneSource, /export function NotebookEditorPane/);
  assert.match(contextPanelSource, /export function NotebookContextPanel/);
});
