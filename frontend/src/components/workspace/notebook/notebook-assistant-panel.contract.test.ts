import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookAssistantPanel keeps the ask tab as a lightweight notebook chat shell", async () => {
  const panelSource = await readFile(
    new URL("./notebook-assistant-panel.tsx", import.meta.url),
    "utf8",
  );
  const composerSource = await readFile(
    new URL("./notebook-assistant-composer.tsx", import.meta.url),
    "utf8",
  );
  const contextPanelSource = await readFile(
    new URL("./notebook-context-panel.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = await readFile(new URL("./notebook-page.tsx", import.meta.url), "utf8");

  assert.match(panelSource, /笔记助手/);
  assert.match(panelSource, /新对话/);
  assert.match(panelSource, /MessageList/);
  assert.match(panelSource, /ThreadContext\.Provider/);
  assert.match(panelSource, /useThreadStream/);
  assert.match(panelSource, /useCreateOrResumeNotebookAssistantSession/);
  assert.match(panelSource, /\}, \[noteId, sessionId\]\)/);
  assert.doesNotMatch(panelSource, /\}, \[createOrResumeSession, noteId, sessionId\]\)/);
  assert.match(panelSource, /agent_name:\s*"notebook-chat"/);
  assert.match(panelSource, /derivePendingClarification\(thread\.messages\)/);
  assert.match(panelSource, /derivePendingPermissionRequest\(thread\.messages\)/);
  assert.match(panelSource, /NotebookAssistantComposer/);
  assert.match(panelSource, /notebook-assistant-shell/);
  assert.match(panelSource, /notebook-assistant-header/);
  assert.match(panelSource, /notebook-assistant-new-chat/);
  assert.match(panelSource, /notebook-assistant-stream/);
  assert.doesNotMatch(panelSource, /围绕当前笔记继续提问、分析和改写/);
  assert.doesNotMatch(panelSource, /PromptInputActionMenu/);

  assert.match(composerSource, /textarea|Textarea/i);
  assert.match(composerSource, /发送/);
  assert.match(composerSource, /placeholder=/);
  assert.match(composerSource, /max-h-\[3\.6rem\]/);
  assert.match(composerSource, /min-h-\[3\.6rem\]/);
  assert.match(composerSource, /overflow-y-auto/);
  assert.match(composerSource, /notebook-assistant-composer/);
  assert.doesNotMatch(composerSource, /PromptInputActionMenu/);

  assert.match(contextPanelSource, /NotebookAssistantPanel/);
  assert.doesNotMatch(contextPanelSource, /协作建议/);
  assert.doesNotMatch(contextPanelSource, /开启对话/);
  assert.doesNotMatch(contextPanelSource, /usePreviewNotebookAssist/);

  assert.match(pageSource, /notebookAssistantSessionId/);
  assert.match(pageSource, /onStartNewConversation=/);
  assert.doesNotMatch(pageSource, /pathOfNewThread/);
  assert.doesNotMatch(pageSource, /buildNotebookAssistPrompt/);
});
