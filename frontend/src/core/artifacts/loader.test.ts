import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("artifact URL builder preserves artifact path and download semantics", async () => {
  const source = await readFile(new URL("./utils.ts", import.meta.url), "utf8");

  assert.match(source, /artifacts\$\{filepath\}\$\{download \? "\?download=true" : ""\}/);
});

void test("artifact loader throws on non-ok responses instead of rendering raw error JSON", async () => {
  const source = await readFile(new URL("./loader.ts", import.meta.url), "utf8");

  assert.match(source, /if \(!response\.ok\)/);
  assert.match(source, /throw new Error\(`Failed to load artifact \(\$\{response\.status\}\)`\)/);
});
