"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSoulSummary } from "@/core/soul/hooks";
import { describeSoulSummary } from "@/core/soul/presentation";

const SOUL_CONSOLE_HREF = "/workspace/memory/growth?soul=console";

export function SoulSummaryCard() {
  const { soulSummary } = useSoulSummary();
  const description = describeSoulSummary({
    currentSoul: soulSummary?.current_soul ?? null,
    coreSoul: soulSummary?.core_soul ?? null,
    stagedIdentityNarrative: soulSummary?.staged_identity_narrative ?? null,
    summary: soulSummary?.summary ?? null,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Soul</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground leading-7">{description.summary}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href={SOUL_CONSOLE_HREF}>打开 Soul Console</Link>
          </Button>
        </div>
        <div className="text-xs font-medium text-foreground/80">
          {description.baselineLabel}
        </div>
        <div className="text-xs text-muted-foreground">
          {description.relationshipLabel} / {description.identityLabel}
        </div>
        <p className="text-xs text-muted-foreground">
          这里展示当前 soul、relationship-oriented identity 和 identity
          narrative 的汇总结果。
        </p>
        <p className="text-xs text-muted-foreground">
          当前关系姿态：{description.relationshipSummary}
        </p>
        <p className="text-xs text-muted-foreground">
          当前长期基线不会因为一次聊天就被重写。
        </p>
        <p className="text-xs text-muted-foreground">
          我正在变成什么样：{description.stagedSummary}
        </p>
      </CardContent>
    </Card>
  );
}
