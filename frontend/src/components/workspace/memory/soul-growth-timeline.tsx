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
        <p className="text-xs text-muted-foreground">
          最近为什么发生了变化：这里只保留可解释的成长结果，不直接暴露底层原始材料。
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
