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
