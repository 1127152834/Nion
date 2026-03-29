import assert from "node:assert/strict";
import test from "node:test";

const { collectAutomationRuntimeEffects } = await import(
  new URL("./runtime-effects.ts", import.meta.url).href,
);

void test("collects notify and play_sound effects for new succeeded event-task runs", () => {
  const effects = collectAutomationRuntimeEffects({
    jobs: [
      {
        id: "job-notify",
        job_kind: "event_task",
        action_kind: "notify",
        name: "Need my attention",
        prompt: "Notify me",
      },
      {
        id: "job-sound",
        job_kind: "event_task",
        action_kind: "play_sound",
        name: "Play cue",
        prompt: "Play cue",
        package_manifest: { files: ["tone.mp3"] },
      },
    ],
    runs: [
      {
        id: "run-1",
        job_id: "job-notify",
        status: "succeeded",
        result_summary: "Need my attention",
      },
      {
        id: "run-2",
        job_id: "job-sound",
        status: "succeeded",
        result_summary: "Played sound action: default",
      },
    ],
    seenRunIds: new Set(),
  });

  assert.equal(effects.length, 2);
  assert.equal(effects[0]?.kind, "notify");
  assert.equal(effects[1]?.kind, "play_sound");
  assert.equal(effects[1]?.audioPath, "/api/automation/jobs/job-sound/package/files/tone.mp3");
});

void test("ignores non-event-task and already-seen runs", () => {
  const effects = collectAutomationRuntimeEffects({
    jobs: [
      {
        id: "job-task",
        job_kind: "scheduled_task",
        action_kind: "notify",
        name: "Scheduled",
        prompt: "Scheduled",
      },
    ],
    runs: [
      {
        id: "run-1",
        job_id: "job-task",
        status: "succeeded",
        result_summary: "Scheduled",
      },
    ],
    seenRunIds: new Set(["run-1"]),
  });

  assert.equal(effects.length, 0);
});
