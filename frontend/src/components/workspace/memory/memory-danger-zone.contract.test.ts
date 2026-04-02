import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory danger zone avoids persistent destructive CTA and uses cleanup entry", async () => {
  const source = await readFile(
    new URL("./memory-danger-zone.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /dangerZoneTitle/);
  assert.doesNotMatch(source, /variant="destructive"/);
});
