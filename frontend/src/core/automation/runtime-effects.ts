import type { AutomationActionKind, AutomationJob, AutomationRun } from "./types";

type RuntimeEffectInput = {
  jobs: Array<Pick<AutomationJob, "id" | "job_kind" | "action_kind" | "name" | "prompt" | "package_manifest">>;
  runs: Array<Pick<AutomationRun, "id" | "job_id" | "status" | "result_summary">>;
  seenRunIds: Set<string>;
};

export type AutomationRuntimeEffect =
  | {
      kind: "notify";
      runId: string;
      title: string;
      body: string;
    }
  | {
      kind: "play_sound";
      runId: string;
      name: string;
      audioPath: string | null;
    };

export function collectAutomationRuntimeEffects(
  input: RuntimeEffectInput,
): AutomationRuntimeEffect[] {
  const jobsById = new Map(input.jobs.map((job) => [job.id, job]));
  const effects: AutomationRuntimeEffect[] = [];

  for (const run of input.runs) {
    if (input.seenRunIds.has(run.id)) {
      continue;
    }
    if (run.status !== "succeeded") {
      continue;
    }
    const job = jobsById.get(run.job_id);
    if (job?.job_kind !== "event_task") {
      continue;
    }
    const effect = buildEffect(
      job.id,
      job.action_kind,
      run.id,
      job.name,
      run.result_summary || job.prompt || "",
      job.package_manifest,
    );
    if (effect) {
      effects.push(effect);
    }
  }

  return effects;
}

function buildEffect(
  jobId: string,
  actionKind: AutomationActionKind,
  runId: string,
  jobName: string,
  summary: string,
  packageManifest: AutomationJob["package_manifest"],
): AutomationRuntimeEffect | null {
  if (actionKind === "notify") {
    return {
      kind: "notify",
      runId,
      title: jobName,
      body: summary,
    };
  }
  if (actionKind === "play_sound") {
    const files = Array.isArray(packageManifest.files)
      ? packageManifest.files.filter((item): item is string => typeof item === "string")
      : [];
    const audioFile =
      files.find((file) => /\.(mp3|wav|ogg|m4a)$/i.test(file)) ?? null;
    return {
      kind: "play_sound",
      runId,
      name: jobName,
      audioPath: audioFile
        ? `/api/automation/jobs/${jobId}/package/files/${audioFile}`
        : null,
    };
  }
  return null;
}
