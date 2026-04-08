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

void test("memory evidence page renders filters, evidence list, preview, and pagination summary", async () => {
  const source = await readSource("./memory-evidence-page.tsx");

  assert.match(source, /useMemoryEvidence/);
  assert.match(source, /thread_id/);
  assert.match(source, /source_type/);
  assert.match(source, /content_preview/);
  assert.match(source, /artifact_uri/);
  assert.match(source, /evidence_id/);
  assert.match(source, /limit/);
  assert.match(source, /offset/);
  assert.match(source, /预览|preview/i);
  assert.match(source, /筛选|过滤|filter/i);
  assert.match(source, /MemoryBackLink/);
  assert.match(source, /pathOfMemory\(\)/);
  assert.doesNotMatch(source, /runtime-trace/i);
});
