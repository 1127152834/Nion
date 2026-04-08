import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readSource(path: string) {
  try {
    return await readFile(new URL(path, import.meta.url), "utf8");
  } catch {
    return "";
  }
}

void test("memory home page links to the read-only memory ledger surface without removing existing entries", async () => {
  const source = await readSource("./memory-home-page.tsx");

  assert.match(source, /pathOfMemorySearch\(\)/);
  assert.match(source, /pathOfMemoryUser\(\)/);
  assert.match(source, /pathOfMemoryHistory\(\)/);
  assert.match(source, /pathOfMemoryFacts\(\)/);
  assert.match(source, /pathOfMemoryGrowth\(\)/);
  assert.match(source, /\/workspace\/memory\/ledger/);
  assert.match(source, /Memory ledger|记忆账本/);
});

void test("memory ledger page renders canonical nodes, revision details, and governance affordances", async () => {
  const source = await readSource("./memory-ledger-page.tsx");

  assert.match(source, /useMemoryLedger/);
  assert.match(source, /canonical_key/);
  assert.match(source, /current_revisions/);
  assert.match(source, /revision/i);
  assert.match(source, /冻结/);
  assert.match(source, /删除/);
  assert.match(source, /重写/);
  assert.match(source, /证据/);
  assert.match(source, /MemoryBackLink/);
  assert.match(source, /pathOfMemory\(\)/);
  assert.doesNotMatch(source, /Soul Console/i);
});

void test("memory user page exposes governance shortcuts to ledger and evidence without dropping user actions", async () => {
  const source = await readSource("./memory-user-page.tsx");

  assert.match(source, /\/workspace\/memory\/ledger/);
  assert.match(source, /\/workspace\/memory\/evidence/);
  assert.match(source, /冻结/);
  assert.match(source, /申请遗忘/);
});
