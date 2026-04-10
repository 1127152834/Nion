import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("welcome surface keeps the workspace input-first tone", async () => {
  const source = await readFile(
    new URL("./welcome.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /animate-wave/);
  assert.doesNotMatch(source, /text-\[clamp\(2\.35rem,4\.6vw,3\.6rem\)\]/);
  assert.doesNotMatch(source, /max-w-\[44rem\]/);
});
