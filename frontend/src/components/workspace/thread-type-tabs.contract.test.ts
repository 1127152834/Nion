import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("thread type tabs expose exactly the three fixed history categories", async () => {
  const source = await readFile(
    new URL("./thread-type-tabs.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /TabsTrigger value="general"/);
  assert.match(source, /TabsTrigger value="project"/);
  assert.match(source, /TabsTrigger value="bridge"/);
  assert.doesNotMatch(source, /TabsTrigger value="all"/);
});
