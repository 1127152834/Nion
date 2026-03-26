import assert from "node:assert/strict";
import test from "node:test";

import {
  pathOfAgentThread,
  pathOfNotebook,
  pathOfNotebookSeededCreate,
  pathOfNotebookTrash,
  pathOfThread,
} from "./desktop-routes.ts";

void test("desktop routes are query-based and static-export friendly", () => {
  assert.equal(pathOfThread("thread-1"), "/workspace/chats?thread=thread-1");
  assert.equal(
    pathOfAgentThread("writer", "thread-2"),
    "/workspace/agents?agent=writer&thread=thread-2",
  );
  assert.equal(pathOfNotebook(), "/workspace/notebook");
  assert.equal(pathOfNotebookTrash(), "/workspace/notebook?view=trash");
  assert.equal(
    pathOfNotebookSeededCreate({
      title: "Roadmap",
      body: "# Roadmap",
      directory: "projects/alpha",
    }),
    "/workspace/notebook?create=1&title=Roadmap&body=%23+Roadmap&directory=projects%2Falpha",
  );
});
