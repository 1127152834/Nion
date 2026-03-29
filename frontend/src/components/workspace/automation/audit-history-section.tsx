"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomationAudit } from "@/core/automation/hooks";

export function AuditHistorySection() {
  const { audit } = useAutomationAudit();

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Audit history</h2>
      </div>
      {audit.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
          No audit events yet.
        </div>
      ) : (
        <div className="space-y-3">
          {audit.map((event) => (
            <Card key={event.id} className="py-0">
              <CardHeader className="px-5 pt-5">
                <CardTitle className="text-sm">approval. {event.action}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 px-5 pb-5 text-sm">
                <div>{event.actor_id}</div>
                <div className="text-xs text-muted-foreground">{event.created_at}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
