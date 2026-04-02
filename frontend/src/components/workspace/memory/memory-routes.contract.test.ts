import assert from "node:assert/strict";
import test from "node:test";

import {
  pathOfMemory,
  pathOfMemoryFacts,
  pathOfMemoryHistory,
  pathOfMemorySearch,
  pathOfMemoryUser,
} from "../../../core/navigation/desktop-routes.ts";

void test("memory routes expose dedicated pages for split surfaces", () => {
  assert.equal(pathOfMemory(), "/workspace/memory");
  assert.equal(pathOfMemorySearch(), "/workspace/memory/search");
  assert.equal(pathOfMemoryUser(), "/workspace/memory/user");
  assert.equal(pathOfMemoryHistory(), "/workspace/memory/history");
  assert.equal(pathOfMemoryFacts(), "/workspace/memory/facts");
});
