"use client";

import { Button } from "@/components/ui/button";

export interface RetrievalRecommendedStackCardProps {
  embeddingModel: string;
  rerankerModel: string;
  consumerCount: number;
  onApply: () => void;
  busy?: boolean;
}

export function RetrievalRecommendedStackCard({
  embeddingModel,
  rerankerModel,
  consumerCount,
  onApply,
  busy = false,
}: RetrievalRecommendedStackCardProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="space-y-1">
        <div className="text-sm font-medium">推荐组合</div>
        <div className="text-muted-foreground text-sm">
          如果你不想自己研究参数，先用系统默认组合。
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-background px-4 py-3">
          <div className="text-muted-foreground text-xs">语义理解</div>
          <div className="mt-1 text-sm font-medium">{embeddingModel}</div>
        </div>
        <div className="rounded-lg border bg-background px-4 py-3">
          <div className="text-muted-foreground text-xs">结果精排</div>
          <div className="mt-1 text-sm font-medium">{rerankerModel}</div>
        </div>
        <div className="rounded-lg border bg-background px-4 py-3">
          <div className="text-muted-foreground text-xs">影响范围</div>
          <div className="mt-1 text-sm font-medium">{consumerCount} 个模块</div>
        </div>
      </div>

      <div className="flex justify-start">
        <Button type="button" variant="outline" onClick={onApply} disabled={busy}>
          {busy ? "正在应用..." : "应用推荐组合"}
        </Button>
      </div>
    </section>
  );
}
