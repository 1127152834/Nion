import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  pathOfMemory,
  pathOfMemoryFacts,
  pathOfMemoryHistory,
  pathOfMemorySearch,
  pathOfMemoryUser,
} from "../../../core/navigation/desktop-routes.ts";

void test("memory routes expose dedicated pages for split surfaces", () => {
  assert.equal(pathOfMemory(), "/workspace/memory");
  assert.equal(pathOfMemorySearch(), "/workspace/memory/search");
  assert.equal(pathOfMemoryUser(), "/workspace/memory/user");
  assert.equal(pathOfMemoryHistory(), "/workspace/memory/history");
  assert.equal(pathOfMemoryFacts(), "/workspace/memory/facts");
});

void test("memory route components exist for each split surface", async () => {
  const routePageSource = await readFile(
    new URL("../../../app/workspace/memory/page.tsx", import.meta.url),
    "utf8",
  );
  const searchPageSource = await readFile(
    new URL("../../../app/workspace/memory/search/page.tsx", import.meta.url),
    "utf8",
  );
  const userPageSource = await readFile(
    new URL("../../../app/workspace/memory/user/page.tsx", import.meta.url),
    "utf8",
  );
  const historyPageSource = await readFile(
    new URL("../../../app/workspace/memory/history/page.tsx", import.meta.url),
    "utf8",
  );
  const factsPageSource = await readFile(
    new URL("../../../app/workspace/memory/facts/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(routePageSource, /MemoryHomePage/);
  assert.match(searchPageSource, /MemorySearchPage/);
  assert.match(userPageSource, /MemoryUserPage/);
  assert.match(historyPageSource, /MemoryHistoryPage/);
  assert.match(factsPageSource, /MemoryFactsPage/);
});
