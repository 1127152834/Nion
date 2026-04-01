import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("candidate center drawer exposes ready candidates and actions", async () => {
  const source = await readFile(
    new URL("./candidate-center-drawer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /候选中心/);
  assert.match(source, /apply|应用/);
  assert.match(source, /dismiss|拒绝/);
  assert.match(source, /defer|稍后处理/);
  assert.match(source, /source_summary/);
  assert.match(source, /target_summary/);
});

void test("candidate detail page renders provenance and action history sections", async () => {
  const source = await readFile(
    new URL("./candidate-detail-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /provenance|来源链/);
  assert.match(source, /action_history|动作历史/);
  assert.match(source, /payload|原始负载/);
  assert.match(source, /guard_state|应用条件/);
});
