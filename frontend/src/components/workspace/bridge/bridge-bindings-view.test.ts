import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge section keeps the overview lightweight and avoids internal binding details", async () => {
  const source = await readFile(
    new URL("./BridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /listBindings/);
  assert.doesNotMatch(source, /currentBindingsTitle/);
  assert.doesNotMatch(source, /threadId/);
  assert.doesNotMatch(source, /workingDirectory/);
});
