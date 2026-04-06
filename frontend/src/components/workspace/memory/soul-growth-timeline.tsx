"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSoulProposals } from "@/core/soul/hooks";

export function SoulGrowthTimeline() {
  const { proposals } = useSoulProposals();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Growth</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          这里只展示最近成长的结果和原因，不显示 raw artifacts 或完整反思正文。
        </p>
        {proposals.slice(0, 3).map((proposal) => (
          <div key={proposal.memory_id} className="rounded border px-3 py-2 text-muted-foreground">
            {proposal.summary}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
