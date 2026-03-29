import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("event-task form exposes intervention and automation failure events plus quick templates", async () => {
  const source = await readFile(new URL("./event-task-form.tsx", import.meta.url), "utf8");

  assert.match(source, /clarification\.requested/);
  assert.match(source, /permission\.requested/);
  assert.match(source, /automation\.run\.failed/);
  assert.match(source, /quickTemplates/);
  assert.match(source, /setEventName/);
});
