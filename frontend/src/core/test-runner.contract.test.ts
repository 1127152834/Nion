import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("frontend package exposes a stable contract test runner", async () => {
  const source = await readFile(
    new URL("../../package.json", import.meta.url),
    "utf8",
  );

  assert.match(source, /"test:contracts"/);
});
