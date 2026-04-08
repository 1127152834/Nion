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
});
