import assert from "node:assert/strict";
import test from "node:test";

const { buildEventTaskRequest } = await import(
  new URL("./event-task-builder.ts", import.meta.url).href
);

void test("builds an event-task request for a reply-finished prompt action", () => {
  const draft = buildEventTaskRequest({
    name: "Reply finished alert",
    prompt: "Summarize the reply and notify me",
    eventName: "agent.run.completed",
    actionKind: "notify",
  });

  assert.equal(draft.job_kind, "event_task");
  assert.equal(draft.schedule_kind, "event");
  assert.equal(draft.schedule_preset, "event");
  assert.equal(draft.trigger_kind, "event");
  assert.equal(draft.trigger_spec.event_name, "agent.run.completed");
  assert.equal(draft.action_kind, "notify");
});
