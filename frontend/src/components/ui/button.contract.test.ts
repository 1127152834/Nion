import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("button omits variant and size data attributes when props are undefined", async () => {
  const source = await readFile(new URL("./button.tsx", import.meta.url), "utf8");

  assert.match(source, /\{\.\.\.\(variant !== undefined && \{ "data-variant": variant \}\)\}/);
  assert.match(source, /\{\.\.\.\(size !== undefined && \{ "data-size": size \}\)\}/);
  assert.doesNotMatch(source, /data-variant=\{variant\}/);
  assert.doesNotMatch(source, /data-size=\{size\}/);
});
