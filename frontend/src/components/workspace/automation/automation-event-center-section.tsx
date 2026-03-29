"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  resolveAutomationEventRunHref,
  resolveAutomationEventThreadHref,
  summarizeAutomationEvent,
} from "@/core/automation/event-presentation";
import { useReplayAutomationEvent } from "@/core/automation/hooks";
import type { AutomationEvent } from "@/core/automation/types";

export function AutomationEventCenterSection({
  events,
  categoryFilter,
  eventTypeFilter,
  onCategoryFilterChange,
  onEventTypeFilterChange,
  onCreateFromEvent,
}: {
  events: AutomationEvent[];
  categoryFilter: string;
  eventTypeFilter: string;
  onCategoryFilterChange: (value: string) => void;
  onEventTypeFilterChange: (value: string) => void;
  onCreateFromEvent?: (event: AutomationEvent) => void;
}) {
  const replayEvent = useReplayAutomationEvent();

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Event Center</h2>
        <p className="text-sm text-muted-foreground">
          Review recent automation, thread, and agent events in one place.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Filter by category"
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value)}
        />
        <Input
          placeholder="Filter by event type"
          value={eventTypeFilter}
          onChange={(event) => onEventTypeFilterChange(event.target.value)}
        />
      </div>
      {events.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
          No events recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const summary = summarizeAutomationEvent(event);
            const threadHref = resolveAutomationEventThreadHref(event);
            const runHref = resolveAutomationEventRunHref(event);
            return (
            <Card key={event.event_id} className="py-0">
              <CardHeader className="px-5 pt-5">
                <CardTitle className="text-sm">
                  <Link href={`/workspace/automation/events/${event.event_id}`}>
                    {summary.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 px-5 pb-5 text-sm">
                <div>{event.message}</div>
                <div className="text-xs text-muted-foreground">
                  {summary.meta || "unknown time"}
                </div>
                {event.thread_id ? (
                  <div className="text-xs text-muted-foreground">
                    Thread:{" "}
                    {threadHref ? <Link href={threadHref}>{event.thread_id}</Link> : event.thread_id}
                  </div>
                ) : null}
                {event.run_id ? (
                  <div className="text-xs text-muted-foreground">
                    Run: {runHref ? <Link href={runHref}>{event.run_id}</Link> : event.run_id}
                  </div>
                ) : null}
                <div className="pt-2">
                  <div className="text-xs font-medium text-foreground/80">Event details</div>
                  <pre className="mt-1 overflow-x-auto rounded-md border bg-muted/20 p-2 text-[11px] text-muted-foreground">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                </div>
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
                    onClick={() => onCreateFromEvent?.(event)}
                  >
                    Create event task
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </section>
  );
}
