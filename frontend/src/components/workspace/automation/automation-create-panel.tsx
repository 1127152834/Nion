"use client";

import type { AutomationJobCreateInput } from "@/core/automation/types";

import { AutomationCreator } from "./automation-creator";

type AutomationCreatePanelProps = {
  isPending: boolean;
  onCreate: (input: AutomationJobCreateInput) => Promise<unknown>;
};

export function AutomationCreatePanel({
  isPending,
  onCreate,
}: AutomationCreatePanelProps) {
  return (
    <section>
      <AutomationCreator isPending={isPending} onSubmit={onCreate} />
    </section>
  );
}
