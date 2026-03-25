import test from "node:test";
import assert from "node:assert/strict";

import { shouldKeepPrimaryInstance } from "../dist/main/single-instance.js";

test("single-instance helper keeps the primary process and rejects the second", () => {
  assert.equal(shouldKeepPrimaryInstance(true), true);
  assert.equal(shouldKeepPrimaryInstance(false), false);
});
