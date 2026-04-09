import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory route page keeps only the home surface as a required product route", async () => {
  const homeRoute = await readFile(
    new URL("../../../app/workspace/memory/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(homeRoute, /MemoryHomePage/);
});
