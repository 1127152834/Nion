import assert from "node:assert/strict";
import test from "node:test";

const {
  resolveAutomationEventRunHref,
  resolveAutomationEventThreadHref,
  summarizeAutomationEvent,
} = await import(
  new URL("./event-presentation.ts", import.meta.url).href,
);

void test("summarizeAutomationEvent gives product-friendly labels for common events", () => {
  const summary = summarizeAutomationEvent({
    event_id: "evt-1",
    category: "thread",
    level: "info",
    event_type: "thread.finished",
    actor: "system",
    message: "Thread finished",
    details: {},
    timestamp: "2026-03-29T12:00:00Z",
  });

  assert.equal(summary.title, "Thread finished");
  assert.match(summary.meta, /thread/);
});

void test("summarizeAutomationEvent falls back to event type when message is missing", () => {
  const summary = summarizeAutomationEvent({
    event_id: "evt-2",
    category: "agent",
    level: "error",
    event_type: "agent.run.failed",
    actor: "agent",
    message: "",
    details: {},
    timestamp: null,
  });

  assert.equal(summary.title, "agent.run.failed");
  assert.match(summary.meta, /agent/);
});

void test("resolveAutomationEventThreadHref routes thread events to the thread workspace", () => {
  const href = resolveAutomationEventThreadHref({
    thread_id: "thread-123",
    details: {},
  });

  assert.equal(href, "/workspace/chats?thread=thread-123");
});

void test("resolveAutomationEventRunHref routes run references to automation history", () => {
  const href = resolveAutomationEventRunHref({
    run_id: "run-456",
  });

  assert.equal(href, "/workspace/automation?tab=history&run=run-456");
});
