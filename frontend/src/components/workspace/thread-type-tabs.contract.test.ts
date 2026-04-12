import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("thread type tabs expose exactly the two fixed history categories", async () => {
  const source = await readFile(
    new URL("./thread-type-tabs.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /value="general"/);
  assert.match(source, /value="bridge"/);
  assert.doesNotMatch(source, /value="project"/);
  assert.doesNotMatch(source, /TabsTrigger value="all"/);
});
