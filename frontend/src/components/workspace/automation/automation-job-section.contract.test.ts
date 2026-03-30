import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("job cards do not expose technical governance badges in the primary header", async () => {
  const source = await readFile(
    new URL("./automation-job-section.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /owner_id:/);
  assert.doesNotMatch(source, /visibility:/);
  assert.doesNotMatch(source, /approval_policy:/);
});
