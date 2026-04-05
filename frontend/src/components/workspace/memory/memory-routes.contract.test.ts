import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  pathOfMemory,
  pathOfMemoryFacts,
  pathOfMemoryGrowth,
  pathOfMemoryHistory,
  pathOfMemorySearch,
  pathOfMemorySearchResults,
  pathOfMemoryUser,
} from "../../../core/navigation/desktop-routes.ts";

void test("memory routes expose dedicated pages for split surfaces", () => {
  assert.equal(pathOfMemory(), "/workspace/memory");
  assert.equal(pathOfMemorySearch(), "/workspace/memory/search");
  assert.equal(
    pathOfMemorySearchResults("query"),
    "/workspace/memory/search/results?q=query",
  );
  assert.equal(pathOfMemoryUser(), "/workspace/memory/user");
  assert.equal(pathOfMemoryHistory(), "/workspace/memory/history");
  assert.equal(pathOfMemoryFacts(), "/workspace/memory/facts");
  assert.equal(pathOfMemoryGrowth(), "/workspace/memory/growth");
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
  const searchResultsPageSource = await readFile(
    new URL("../../../app/workspace/memory/search/results/page.tsx", import.meta.url),
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
  const growthPageSource = await readFile(
    new URL("../../../app/workspace/memory/growth/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(routePageSource, /MemoryHomePage/);
  assert.match(searchPageSource, /MemorySearchPage/);
  assert.match(searchResultsPageSource, /MemorySearchResultsPage/);
  assert.match(userPageSource, /MemoryUserPage/);
  assert.match(historyPageSource, /MemoryHistoryPage/);
  assert.match(factsPageSource, /MemoryFactsPage/);
  assert.match(growthPageSource, /MemoryGrowthPage/);
});

void test("desktop renderer also wires the memory growth route", async () => {
  const rendererSource = await readFile(
    new URL("../../../../../desktop/src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(rendererSource, /WorkspaceMemoryGrowthPage/);
  assert.match(rendererSource, /path="\/workspace\/memory\/growth"/);
});
