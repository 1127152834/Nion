"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventTaskDraftCard } from "@/components/workspace/automation/event-task-draft-card";
import {
  buildEventTaskDraftFromEvent,
  resolveAutomationEventRunHref,
  resolveAutomationEventThreadHref,
  summarizeAutomationEvent,
} from "@/core/automation/event-presentation";
import { buildEventTaskRequest } from "@/core/automation/event-task-builder";
import { useAutomationEvent, useReplayAutomationEvent } from "@/core/automation/hooks";

export function AutomationEventDetailPage({ eventId }: { eventId: string }) {
  const { event, isLoading, error } = useAutomationEvent(eventId);
  const replayEvent = useReplayAutomationEvent();
  const [draftVisible, setDraftVisible] = useState(false);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading automation event…</div>;
  }

  if (!event || error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
        {error instanceof Error ? error.message : "Automation event not found."}
      </div>
    );
  }

  const summary = summarizeAutomationEvent(event);
  const draft = buildEventTaskDraftFromEvent(event);
  const threadHref = resolveAutomationEventThreadHref(event);
  const runHref = resolveAutomationEventRunHref(event);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{summary.title}</h1>
        <p className="text-sm text-muted-foreground">{summary.meta}</p>
      </header>

      <Card className="py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-5 pb-5 text-sm">
          <div>Category: {event.category}</div>
          <div>Level: {event.level}</div>
          <div>
            Thread:{" "}
            {event.thread_id
              ? threadHref
                ? <Link href={threadHref}>{event.thread_id}</Link>
                : event.thread_id
              : "n/a"}
          </div>
          <div>
            Run:{" "}
            {event.run_id
              ? runHref
                ? <Link href={runHref}>{event.run_id}</Link>
                : event.run_id
              : "n/a"}
          </div>
          <pre className="overflow-x-auto rounded-md border bg-muted/20 p-3 text-[11px] text-muted-foreground">
            {JSON.stringify(event.details, null, 2)}
          </pre>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void replayEvent.mutateAsync({
                  eventName: event.event_type,
                  payload: event.details,
                })
              }
            >
              Replay event
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraftVisible((value) => !value)}
            >
              Create event task
            </Button>
          </div>
        </CardContent>
      </Card>

      {draftVisible ? (
        <EventTaskDraftCard
          draft={buildEventTaskRequest({
            name: draft.name,
            prompt: draft.prompt,
            eventName: draft.eventName,
            actionKind: draft.actionKind,
          })}
        />
      ) : null}
    </section>
  );
}
