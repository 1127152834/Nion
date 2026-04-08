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

void test("memory home page links to evidence and runtime trace governance surfaces", async () => {
  const source = await readSource("./memory-home-page.tsx");

  assert.match(source, /\/workspace\/memory\/evidence/);
  assert.match(source, /\/workspace\/memory\/runtime-trace/);
  assert.match(source, /Memory evidence|证据/);
  assert.match(source, /Runtime trace|运行轨迹/);
});

void test("memory evidence core exposes typed filtered fetch wrapper and query hook", async () => {
  const apiSource = await readSource("../../../core/memory-evidence/api.ts");
  const hooksSource = await readSource("../../../core/memory-evidence/hooks.ts");
  const typesSource = await readSource("../../../core/memory-evidence/types.ts");

  assert.match(typesSource, /export interface MemoryEvidenceItem/);
  assert.match(typesSource, /export interface MemoryEvidencePaging/);
  assert.match(typesSource, /export interface MemoryEvidenceResponse/);
  assert.match(typesSource, /export interface MemoryEvidenceQuery/);

  assert.match(apiSource, /export async function loadMemoryEvidence/);
  assert.match(apiSource, /\/api\/memory\/evidence/);
  assert.match(apiSource, /URLSearchParams/);
  assert.match(apiSource, /thread_id/);
  assert.match(apiSource, /source_type/);
  assert.match(apiSource, /limit/);
  assert.match(apiSource, /offset/);
  assert.doesNotMatch(apiSource, /method:\s*["']POST["']|method:\s*["']PATCH["']|method:\s*["']DELETE["']/);

  assert.match(hooksSource, /export function useMemoryEvidence/);
  assert.match(hooksSource, /useQuery/);
  assert.match(hooksSource, /queryKey:\s*\["memory-evidence",\s*query\]/);
  assert.match(hooksSource, /loadMemoryEvidence\(query\)/);
  assert.doesNotMatch(hooksSource, /useMutation/);
});

void test("memory runtime trace core exposes typed filtered fetch wrapper and query hook", async () => {
  const apiSource = await readSource("../../../core/memory-runtime-trace/api.ts");
  const hooksSource = await readSource("../../../core/memory-runtime-trace/hooks.ts");
  const typesSource = await readSource("../../../core/memory-runtime-trace/types.ts");

  assert.match(typesSource, /export interface MemoryRuntimeTraceEvent/);
  assert.match(typesSource, /export interface MemoryRuntimeTraceResponse/);
  assert.match(typesSource, /export interface MemoryRuntimeTraceQuery/);

  assert.match(apiSource, /export async function loadMemoryRuntimeTrace/);
  assert.match(apiSource, /\/api\/memory\/runtime-trace/);
  assert.match(apiSource, /URLSearchParams/);
  assert.match(apiSource, /thread_id/);
  assert.match(apiSource, /event_type/);
  assert.match(apiSource, /limit/);
  assert.doesNotMatch(apiSource, /method:\s*["']POST["']|method:\s*["']PATCH["']|method:\s*["']DELETE["']/);

  assert.match(hooksSource, /export function useMemoryRuntimeTrace/);
  assert.match(hooksSource, /useQuery/);
  assert.match(hooksSource, /queryKey:\s*\["memory-runtime-trace",\s*query\]/);
  assert.match(hooksSource, /loadMemoryRuntimeTrace\(query\)/);
  assert.doesNotMatch(hooksSource, /useMutation/);
});
