import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("task dialog uses dedicated automation task composer instead of plain textarea", async () => {
  const dialogSource = await readFile(
    new URL("./automation-task-dialog.tsx", import.meta.url),
    "utf8",
  );
  const composerSource = await readFile(
    new URL("./automation-task-composer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(dialogSource, /AutomationTaskComposer/);
  assert.match(dialogSource, /PromptInputProvider/);
  assert.doesNotMatch(dialogSource, /Textarea/);
  assert.match(composerSource, /PromptInput/);
  assert.match(composerSource, /PromptInputTextarea/);
});

void test("task composer exposes notebook and skill insertion flows", async () => {
  const composerSource = await readFile(
    new URL("./automation-task-composer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(composerSource, /buildNotebookDirectoryMentionOptions/);
  assert.match(composerSource, /buildNotebookDirectoryObjectMention/);
  assert.match(composerSource, /buildObjectImplicitMentions/);
  assert.match(composerSource, /selectedObjectMentions/);
  assert.match(composerSource, /selectedSkills/);
  assert.match(composerSource, /selectedMcpTools/);
  assert.match(composerSource, /selectedCliTools/);
  assert.ok(composerSource.includes('type MentionTrigger = "@" | "/"'));
  assert.match(composerSource, /const trigger: MentionTrigger = option\.kind === "skill" \? "\/" : "@"/);
  assert.match(composerSource, /const mentionText = `\$\{trigger\}\$\{option\.value\}`/);
});

void test("automation draft request can carry implicit mentions for scheduled tasks", async () => {
  const draftBuilderSource = await readFile(
    new URL("../../../core/automation/draft-builder.ts", import.meta.url),
    "utf8",
  );
  const typesSource = await readFile(
    new URL("../../../core/automation/types.ts", import.meta.url),
    "utf8",
  );

  assert.match(draftBuilderSource, /implicitMentions/);
  assert.match(draftBuilderSource, /session_policy/);
  assert.match(typesSource, /implicit_mentions\?:/);
});
