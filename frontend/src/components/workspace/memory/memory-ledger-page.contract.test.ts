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

void test("memory ledger core exposes typed read-only fetch wrapper and query hook", async () => {
  const apiSource = await readSource("../../../core/memory-ledger/api.ts");
  const hooksSource = await readSource("../../../core/memory-ledger/hooks.ts");
  const typesSource = await readSource("../../../core/memory-ledger/types.ts");

  assert.match(typesSource, /export interface MemoryLedgerNode/);
  assert.match(typesSource, /export interface MemoryLedgerRevision/);
  assert.match(typesSource, /export interface MemoryLedgerResponse/);
  assert.match(typesSource, /nodes: MemoryLedgerNode\[\]/);
  assert.match(typesSource, /current_revisions: MemoryLedgerRevision\[\]/);

  assert.match(apiSource, /getBackendBaseURL/);
  assert.match(apiSource, /export async function loadMemoryLedger/);
  assert.match(apiSource, /\/api\/memory\/ledger/);
  assert.match(apiSource, /Promise<MemoryLedgerResponse>/);
  assert.doesNotMatch(apiSource, /method:\s*["']POST["']|method:\s*["']PATCH["']|method:\s*["']DELETE["']/);

  assert.match(hooksSource, /useQuery/);
  assert.match(hooksSource, /queryKey:\s*\["memory-ledger"\]/);
  assert.match(hooksSource, /queryFn:\s*\(\)\s*=>\s*loadMemoryLedger\(\)/);
  assert.match(hooksSource, /export function useMemoryLedger/);
  assert.doesNotMatch(hooksSource, /useMutation/);
});
