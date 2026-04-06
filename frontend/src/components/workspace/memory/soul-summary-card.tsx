"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSoulSummary } from "@/core/soul/hooks";
import { describeSoulSummary } from "@/core/soul/presentation";

export function SoulSummaryCard() {
  const { soulSummary } = useSoulSummary();
  const description = describeSoulSummary({
    currentSoul: soulSummary?.current_soul ?? null,
    coreSoul: soulSummary?.core_soul ?? null,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Soul</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground leading-7">{description.summary}</p>
        <div className="text-xs text-muted-foreground">
          {description.relationLabel} / {description.identityLabel}
        </div>
        <p className="text-xs text-muted-foreground">
          这里展示当前 soul、relationship-oriented identity 和 identity
          narrative 的汇总结果。
        </p>
      </CardContent>
    </Card>
  );
}
