import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workflow form exposes ordered step creation and wait-for-user support", async () => {
  const source = await readFile(new URL("./workflow-form.tsx", import.meta.url), "utf8");

  assert.match(source, /wait_for_user/);
  assert.match(source, /agent_prompt/);
  assert.match(source, /delay/);
  assert.match(source, /workflow_steps/);
  assert.match(source, /Add step/);
  assert.match(source, /Create workflow/);
});
