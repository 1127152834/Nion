import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("prompt input composes external keydown handling before built-in Enter submit behavior", async () => {
  const source = await readFile(
    new URL("./prompt-input.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /const composedKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = \(e\) => \{\s*onKeyDown\?\.\(e\);\s*if \(e\.defaultPrevented\) \{\s*return;\s*\}\s*handleKeyDown\(e\);\s*\};/s,
  );
  assert.match(source, /onKeyDown=\{composedKeyDown\}/);
});
