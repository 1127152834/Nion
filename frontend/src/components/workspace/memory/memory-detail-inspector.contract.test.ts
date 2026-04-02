import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory detail inspector uses compact stacked sections without oversized headline spacing", async () => {
  const source = await readFile(
    new URL("./memory-detail-inspector.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Detail inspector/);
  assert.match(source, /space-y-3/);
  assert.match(source, /text-\[1\.5rem\]|text-\[1\.625rem\]/);
  assert.doesNotMatch(source, /text-\[2rem\]/);
  assert.doesNotMatch(source, /space-y-4 px-4 py-4/);
});
