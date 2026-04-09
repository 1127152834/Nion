import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readFileOrEmpty(url: URL) {
  try {
    return await readFile(url, "utf8");
  } catch {
    return "";
  }
}

void test("soul console contract exposes layered surfaces, revision metadata, and edit affordances", async () => {
  const growthPageSource = await readFile(
    new URL("./memory-growth-page.tsx", import.meta.url),
    "utf8",
  );
  const homePageSource = await readFile(
    new URL("./memory-home-page.tsx", import.meta.url),
    "utf8",
  );
  const consoleSource = await readFileOrEmpty(
    new URL("./soul-console-page.tsx", import.meta.url),
  );

  assert.match(growthPageSource, /SoulConsolePage/);
  assert.match(homePageSource, /Soul Console|soul-console/i);
  assert.match(consoleSource, /Soul Console/);
  assert.match(consoleSource, /constitution/i);
  assert.match(consoleSource, /identity narrative/i);
  assert.match(consoleSource, /relationship stance/i);
  assert.match(consoleSource, /adaptive overlay/i);
  assert.match(consoleSource, /当前 revision/);
  assert.match(consoleSource, /原因/);
  assert.match(consoleSource, /时间/);
  assert.match(consoleSource, /编辑 relationship stance/i);
  assert.match(consoleSource, /编辑 adaptive overlay/i);
  assert.match(consoleSource, /回滚 recent overlay|回滚 overlay/i);
  assert.match(consoleSource, /冻结某层不再自动演化|冻结自动演化/i);
});

void test("soul console contract is reachable from a dedicated route instead of query-param piggybacking", async () => {
  const homePageSource = await readFile(
    new URL("./memory-home-page.tsx", import.meta.url),
    "utf8",
  );
  const summaryCardSource = await readFile(
    new URL("./soul-summary-card.tsx", import.meta.url),
    "utf8",
  );
  const proposalListSource = await readFile(
    new URL("./soul-proposal-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(homePageSource, /\/workspace\/memory\/soul|pathOfMemorySoul/);
  assert.match(summaryCardSource, /\/workspace\/memory\/soul|pathOfMemorySoul/);
  assert.match(proposalListSource, /\/workspace\/memory\/soul|pathOfMemorySoul/);
  assert.doesNotMatch(homePageSource, /growth\?soul=console/);
  assert.doesNotMatch(summaryCardSource, /growth\?soul=console/);
  assert.doesNotMatch(proposalListSource, /growth\?soul=console/);
});
