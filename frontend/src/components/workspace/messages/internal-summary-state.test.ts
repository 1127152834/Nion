import assert from "node:assert/strict";
import test from "node:test";

import { toggleInternalSummaryOpen } from "./internal-summary-state.ts";

void test("toggleInternalSummaryOpen opens then closes the same summary id", () => {
  const opened = toggleInternalSummaryOpen(new Set<string>(), "summary-1");
  assert.deepEqual([...opened], ["summary-1"]);

  const closed = toggleInternalSummaryOpen(opened, "summary-1");
  assert.deepEqual([...closed], []);
});
