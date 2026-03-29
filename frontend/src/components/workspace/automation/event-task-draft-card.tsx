"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateAutomationJob } from "@/core/automation/hooks";
import type { AutomationJobCreateInput } from "@/core/automation/types";

export function EventTaskDraftCard({
  draft,
}: {
  draft: AutomationJobCreateInput;
}) {
  const createAutomationJob = useCreateAutomationJob();
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await createAutomationJob.mutateAsync(draft);
    setSaved(true);
  }

  const eventName =
    typeof draft.trigger_spec?.event_name === "string"
      ? draft.trigger_spec.event_name
      : typeof draft.schedule_value === "string"
        ? draft.schedule_value
        : "unknown";

  return (
    <Card className="py-0">
      <CardHeader className="px-5 pt-5">
        <CardTitle>Event task draft</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-5 text-sm">
        <div className="font-medium">{draft.name}</div>
        <div className="text-muted-foreground">{draft.prompt}</div>
        <div className="text-muted-foreground">
          Trigger: {eventName}
        </div>
        <div className="text-muted-foreground">Action: {draft.action_kind}</div>
        <Button type="button" onClick={() => void handleSave()} disabled={saved || createAutomationJob.isPending}>
          {saved ? "Saved" : "Save event task"}
        </Button>
      </CardContent>
    </Card>
  );
}
