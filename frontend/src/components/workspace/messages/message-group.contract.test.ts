import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("web fetch result links avoid parent click-open duplication and use noopener noreferrer", async () => {
  const source = await readFile(new URL("./message-group.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /window\.open\(url,\s*"_blank"/);
  assert.match(source, /<a[\s\S]*href=\{url\}[\s\S]*target="_blank"[\s\S]*rel="noopener noreferrer"[\s\S]*>/m);
});
