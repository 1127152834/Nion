import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { pathOfMemory } from "../../../core/navigation/desktop-routes.ts";

void test("memory routes collapse to the single user-facing home surface", () => {
  assert.equal(pathOfMemory(), "/workspace/memory");
});

void test("memory home route remains the only required product surface", async () => {
  const routePageSource = await readFile(
    new URL("../../../app/workspace/memory/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(routePageSource, /MemoryHomePage/);
});

void test("desktop renderer no longer wires growth, soul, search, facts, or runtime-trace as product routes", async () => {
  const rendererSource = await readFile(
    new URL("../../../../../desktop/src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(rendererSource, /path="\/workspace\/memory\/search"/);
  assert.doesNotMatch(rendererSource, /path="\/workspace\/memory\/search\/results"/);
  assert.doesNotMatch(rendererSource, /path="\/workspace\/memory\/facts"/);
  assert.doesNotMatch(rendererSource, /path="\/workspace\/memory\/growth"/);
  assert.doesNotMatch(rendererSource, /path="\/workspace\/memory\/soul"/);
  assert.doesNotMatch(rendererSource, /path="\/workspace\/memory\/runtime-trace"/);
});
