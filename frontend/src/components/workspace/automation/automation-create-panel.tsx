"use client";

import type {
  AutomationJob,
  AutomationJobCreateInput,
  AutomationRun,
  AutomationStatus,
} from "@/core/automation/types";

import { AutomationCreator } from "./automation-creator";
import { AutomationOverviewCards } from "./automation-overview-cards";

type AutomationCreatePanelProps = {
  jobs: AutomationJob[];
  runs: AutomationRun[];
  status: AutomationStatus;
  isPending: boolean;
  onCreate: (input: AutomationJobCreateInput) => Promise<unknown>;
};

export function AutomationCreatePanel({
  jobs,
  runs,
  status,
  isPending,
  onCreate,
}: AutomationCreatePanelProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <AutomationCreator isPending={isPending} onSubmit={onCreate} />
      <AutomationOverviewCards status={status} runs={runs} jobs={jobs} />
    </section>
  );
}
