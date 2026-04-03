import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory route pages reference the expected dedicated surface components", async () => {
  const homeRoute = await readFile(
    new URL("../../../app/workspace/memory/page.tsx", import.meta.url),
    "utf8",
  );
  const searchRoute = await readFile(
    new URL("../../../app/workspace/memory/search/page.tsx", import.meta.url),
    "utf8",
  );
  const searchResultsRoute = await readFile(
    new URL("../../../app/workspace/memory/search/results/page.tsx", import.meta.url),
    "utf8",
  );
  const userRoute = await readFile(
    new URL("../../../app/workspace/memory/user/page.tsx", import.meta.url),
    "utf8",
  );
  const historyRoute = await readFile(
    new URL("../../../app/workspace/memory/history/page.tsx", import.meta.url),
    "utf8",
  );
  const factsRoute = await readFile(
    new URL("../../../app/workspace/memory/facts/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(homeRoute, /MemoryHomePage/);
  assert.match(searchRoute, /MemorySearchPage/);
  assert.match(searchResultsRoute, /MemorySearchResultsPage/);
  assert.match(userRoute, /MemoryUserPage/);
  assert.match(historyRoute, /MemoryHistoryPage/);
  assert.match(factsRoute, /MemoryFactsPage/);
});
