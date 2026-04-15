import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("rehype word splitter leaves CJK text nodes unsplit", async () => {
  const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /const CJK_TEXT_RE\s*=\s*\/\[\\p\{Script=Han\}\\p\{Script=Hiragana\}\\p\{Script=Katakana\}\\p\{Script=Hangul\}\]\/u/,
  );
  assert.match(source, /if \(CJK_TEXT_RE\.test\(child\.value\)\) \{\s*newChildren\.push\(child\);\s*return;\s*\}/s);
});
