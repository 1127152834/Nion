"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSoulProposals } from "@/core/soul/hooks";
import { describeSoulGrowthEvents } from "@/core/soul/presentation";

export function SoulGrowthTimeline(props: {
  lastAcceptedProposalId?: string | null;
  lastRejectedProposalId?: string | null;
}) {
  const { proposals } = useSoulProposals();
  const events = describeSoulGrowthEvents(proposals, {
    lastAcceptedProposalId: props.lastAcceptedProposalId ?? null,
    lastRejectedProposalId: props.lastRejectedProposalId ?? null,
  });

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
        <p className="text-xs text-muted-foreground">
          事件会以“提案生成 / 刚刚生效 / 已回退”这类状态向用户说明成长过程。
        </p>
        <p className="text-xs text-muted-foreground">
          最近本地联动状态会结合 lastAcceptedProposalId / lastRejectedProposalId 实时更新。
        </p>
        {events.slice(0, 3).map((event) => (
          <div key={event.id} className="rounded border px-3 py-2 text-muted-foreground">
            <div className="font-medium text-foreground/80">{event.label}</div>
            <div>{event.summary}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
