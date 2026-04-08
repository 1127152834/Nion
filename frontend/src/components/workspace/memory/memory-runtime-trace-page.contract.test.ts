import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readSource(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

void test("memory runtime trace page renders filters, event list, and details panel", async () => {
  const pageSource = await readSource("./memory-runtime-trace-page.tsx");
  const homeSource = await readSource("./memory-home-page.tsx");

  assert.match(pageSource, /useMemoryRuntimeTrace/);
  assert.match(pageSource, /thread_id/);
  assert.match(pageSource, /event_type/);
  assert.match(pageSource, /metadata/);
  assert.match(pageSource, /Runtime trace|运行轨迹/i);
  assert.match(pageSource, /MemoryBackLink/);
  assert.match(pageSource, /pathOfMemory\(\)/);
  assert.match(pageSource, /Input/);
  assert.match(pageSource, /Badge/);

  assert.match(homeSource, /\/workspace\/memory\/runtime-trace/);
  assert.match(homeSource, /Runtime trace/);
});
