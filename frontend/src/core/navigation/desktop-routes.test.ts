import test from "node:test";
import assert from "node:assert/strict";

import { pathOfAgentThread, pathOfThread } from "./desktop-routes.ts";

test("desktop routes are query-based and static-export friendly", () => {
  assert.equal(pathOfThread("thread-1"), "/workspace/chats?thread=thread-1");
  assert.equal(
    pathOfAgentThread("writer", "thread-2"),
    "/workspace/agents?agent=writer&thread=thread-2",
  );
});
