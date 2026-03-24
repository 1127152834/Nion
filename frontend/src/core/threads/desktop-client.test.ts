import test from "node:test";
import assert from "node:assert/strict";

import { createDesktopThreadClient } from "../api/desktop-client.ts";

test("desktop thread client exposes search/getState/update/delete/stream", () => {
  const client = createDesktopThreadClient({
    getBaseURL: () => "http://127.0.0.1:43115/api/threads",
  });
  assert.equal(typeof client.search, "function");
  assert.equal(typeof client.getState, "function");
  assert.equal(typeof client.updateState, "function");
  assert.equal(typeof client.deleteThread, "function");
  assert.equal(typeof client.streamRun, "function");
});
