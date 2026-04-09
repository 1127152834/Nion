import assert from "node:assert/strict";
import test from "node:test";

import {
  pathOfAgentThread,
  pathOfChatHistoryType,
  pathOfMemory,
  pathOfNotebook,
  pathOfNotebookSeededCreate,
  pathOfNotebookTrash,
  pathOfThread,
} from "./desktop-routes.ts";

void test("desktop routes keep notebook trash on its dedicated page", () => {
  assert.equal(pathOfThread("thread-1"), "/workspace/chats?thread=thread-1");
  assert.equal(
    pathOfThread("thread-1", { type: "project" }),
    "/workspace/chats?thread=thread-1&type=project",
  );
  assert.equal(pathOfChatHistoryType("bridge"), "/workspace/chats?type=bridge");
  assert.equal(
    pathOfAgentThread("writer", "thread-2"),
    "/workspace/agents?agent=writer&thread=thread-2",
  );
  assert.equal(pathOfNotebook(), "/workspace/notebook");
  assert.equal(pathOfNotebookTrash(), "/workspace/notebook/trash");
  assert.equal(pathOfMemory(), "/workspace/memory");
  assert.equal(
    pathOfNotebookSeededCreate({
      title: "Roadmap",
      body: "# Roadmap",
      directory: "projects/alpha",
      source: "chat",
      capture: "thread",
    }),
    "/workspace/notebook?create=1&title=Roadmap&body=%23+Roadmap&directory=projects%2Falpha&source=chat&capture=thread",
  );
});
