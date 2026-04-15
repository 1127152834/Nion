import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("input box allows submitting attachments without text", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /if \(!submissionPayload\.text && message\.files\.length === 0\) \{\s*return;\s*\}/,
  );
});

void test("input box forwards original attachments into submit payload", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /onSubmit\?\.\(\{\s*\.\.\.message,\s*text: submissionPayload\.text,/s,
  );
});

void test("input box mention highlight overlay does not render duplicate visible mention text", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.match(source, /function MentionHighlightOverlay/);
  assert.match(source, /pointer-events-none absolute inset-0/);
  assert.doesNotMatch(source, /text-purple-700|text-amber-700|text-blue-700|text-green-700/);
  assert.doesNotMatch(source, /dark:text-purple-300|dark:text-amber-300|dark:text-blue-300|dark:text-green-300/);
  assert.match(source, /rounded px-0\.5 font-semibold text-transparent", colorClass\)/);
});

void test("input box keeps CLI implicit mentions out of the visible submitted text", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.match(source, /const visibleImplicitMentions: string\[] = \[\];/);
  assert.match(source, /if \(kind !== "cli"\) \{\s*visibleImplicitMentions\.push\(mention\);/s);
  assert.match(source, /const mentionLine = visibleImplicitMentions\.join\(" "\);/);
});

void test("thread submit keeps uploaded files in message additional kwargs after upload completes", async () => {
  const source = await readFile(new URL("../../core/threads/hooks.ts", import.meta.url), "utf8");

  assert.match(source, /const filesForSubmit: FileInMessage\[] = uploadedFileInfo\.map/);
  assert.match(source, /if \(filesForSubmit\.length > 0\) \{\s*messageAdditionalKwargs\.files = filesForSubmit;/s);
  assert.match(source, /additional_kwargs: messageAdditionalKwargs/);
});

void test("input box reads attachment limits from session policy config with 9 files and 20 MB defaults", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.match(source, /DEFAULT_ATTACHMENT_MAX_FILES = 9/);
  assert.match(source, /DEFAULT_ATTACHMENT_MAX_FILE_SIZE_MB = 20/);
  assert.match(source, /configData\.config\.session_policy/);
  assert.match(source, /attachments\.max_files/);
  assert.match(source, /attachments\.max_file_size_mb/);
  assert.match(source, /maxFiles=\{attachmentConfig\.maxFiles\}/);
  assert.match(source, /maxFileSize=\{attachmentConfig\.maxFileSizeBytes\}/);
});

void test("input box no longer drops submit attempts during streaming and instead renders queued message summaries", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /if \(status === "streaming"\) \{\s*onStop\?\.\(\);\s*return;\s*\}/);
  assert.match(source, /thread\.values\.queued_messages/);
  assert.match(source, /messageQueueQueued/);
  assert.match(source, /messageQueueAttachmentOnly/);
});
