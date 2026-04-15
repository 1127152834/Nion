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

void test("derivePendingPermissionRequest keeps latest permission request when a resolved human follow-up exists, leaving hiding to persisted resolution state", () => {
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
        },
      },
    },
    {
      type: "human",
      id: "human-after-resolve",
      content: "继续执行吧",
    },
  ]);

  assert.equal(pending?.requestId, "perm-1");
});

void test("derivePendingPermissionRequest keeps local-actions review metadata", () => {
  const pending = derivePendingPermissionRequest([
    {
      type: "tool",
      id: "tool-local-actions",
      name: "permission_request",
      tool_call_id: "call-local-actions",
      content: "review needed",
      additional_kwargs: {
        permission_request: {
          id: "perm-local-actions",
          tool_name: "local_actions_review",
          tool_input: {
            goal_id: "goal-1",
            plan_id: "plan-1",
            execution_id: "exec-1",
          },
          reason_message: "Review the local action plan before execution.",
          review_title: "Review local actions",
          review_summary: "2 actions, 1 irreversible",
          actions: [
            { key: "allow", label: "Approve" },
            { key: "deny", label: "Reject" },
          ],
        },
      },
    },
  ]);

  assert.equal(pending?.toolName, "local_actions_review");
  assert.equal(pending?.reviewTitle, "Review local actions");
  assert.equal(pending?.reviewSummary, "2 actions, 1 irreversible");
});
