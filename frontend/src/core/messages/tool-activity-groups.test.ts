import assert from "node:assert/strict";
import test from "node:test";

import { groupMessages } from "./utils.ts";

void test("groups tool activity summary as native assistant summary group", () => {
  const result = groupMessages(
    [
      { type: "human", id: "u1", content: "hi" } as any,
      {
        type: "tool_activity_summary",
        id: "tas1",
        content: "Inspected project files",
        additional_kwargs: { group_id: "group-1", tool_names: ["read_file"] },
      } as any,
    ],
    (group) => group.type,
  );

  assert.ok(result.includes("assistant:tool-activity-summary"));
});
