"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomationApprovals } from "@/core/automation/hooks";

export function ApprovalQueueSection({
  onDecide,
}: {
  onDecide: (approvalId: string, decision: "approved" | "denied") => Promise<unknown>;
}) {
  const { approvals } = useAutomationApprovals();

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Approval queue</h2>
      </div>
      {approvals.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
          No pending approvals.
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <Card key={approval.id} className="py-0">
              <CardHeader className="px-5 pt-5">
                <CardTitle className="text-sm">{approval.id}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-5 pb-5 text-sm">
                <div>{approval.reason}</div>
                <div className="text-xs text-muted-foreground">{approval.status}</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void onDecide(approval.id, "approved")
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void onDecide(approval.id, "denied")
                    }
                  >
                    Deny
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
