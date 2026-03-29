import assert from "node:assert/strict";
import test from "node:test";

import { derivePendingPermissionRequest } from "./permission-request.ts";

void test("derivePendingPermissionRequest keeps latest unresolved permission request visible after later human message", () => {
  const pending = derivePendingPermissionRequest([
    {
      type: "tool",
      id: "tool-1",
      name: "permission_request",
      tool_call_id: "call-1",
      content: "permission needed",
      additional_kwargs: {
        permission_request: {
          id: "perm-1",
          tool_name: "codepilot_cli_tools_install",
          tool_input: { command: "brew install stripe" },
          actions: [
            { key: "allow", label: "Allow" },
            { key: "allow_session", label: "Allow Session" },
            { key: "deny", label: "Deny" },
          ],
          options: ["Allow", "Allow Session", "Deny"],
        },
      },
    },
    {
      type: "human",
      id: "human-2",
      content: "好的，我再补充一点上下文",
    },
  ]);

  assert.ok(pending);
  assert.equal(pending?.requestId, "perm-1");
  assert.equal(pending?.toolMessageId, "tool-1");
});
