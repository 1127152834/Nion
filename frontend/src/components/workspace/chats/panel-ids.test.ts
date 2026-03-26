import assert from "node:assert/strict";
import test from "node:test";

import { buildChatPanelIds } from "./panel-ids.ts";

void test("buildChatPanelIds derives stable ids from pathname", () => {
  assert.deepEqual(buildChatPanelIds("/workspace/chats/thread-1"), {
    groupId: "workspace-chats-thread-1-panels",
    separatorId: "workspace-chats-thread-1-separator",
  });
});

void test("buildChatPanelIds falls back for empty pathname", () => {
  assert.deepEqual(buildChatPanelIds(""), {
    groupId: "workspace-panels",
    separatorId: "workspace-separator",
  });
});
