"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useChildRuns } from "@/core/child-runs/hooks";
import type { ChildRunRecord } from "@/core/child-runs/types";

import { ChildRunInspector } from "./child-runs/child-run-inspector";
import { ChildRunList } from "./child-runs/child-run-list";

export function WorkspaceSidebarChildRuns() {
  const searchParams = useSearchParams();
  const threadId = searchParams.get("thread");
  const { data: childRuns = [] } = useChildRuns(threadId);
  const [selectedChildRun, setSelectedChildRun] = useState<ChildRunRecord | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const openChildRuns = useMemo(
    () => childRuns.filter((item) => item.status !== "closed"),
    [childRuns],
  );

  if (!threadId || openChildRuns.length === 0) {
    return null;
  }

  return (
    <>
      <ChildRunList
        childRuns={openChildRuns}
        onSelect={(childRun) => {
          setSelectedChildRun(childRun);
          setInspectorOpen(true);
        }}
      />
      <ChildRunInspector
        open={inspectorOpen}
        threadId={threadId}
        childRunId={selectedChildRun?.child_run_id ?? null}
        childRunPreview={selectedChildRun}
        onOpenChange={setInspectorOpen}
      />
    </>
  );
}
