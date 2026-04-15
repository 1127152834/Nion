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
