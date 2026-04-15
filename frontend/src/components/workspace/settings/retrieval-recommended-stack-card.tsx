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
          可以先用默认组合，再按需要切换到本地模型或 API 模式。
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-background px-4 py-3">
          <div className="text-muted-foreground text-xs">语义理解</div>
          <div className="mt-1 text-sm font-medium">{embeddingModel}</div>
        </div>
        <div className="rounded-lg border bg-background px-4 py-3">
          <div className="text-muted-foreground text-xs">结果精排</div>
          <div className="mt-1 text-sm font-medium">{rerankerModel}</div>
        </div>
      </div>

      <div className="text-muted-foreground text-sm">
        当前会影响 {consumerCount} 个检索消费者。
      </div>

      <div className="flex justify-start">
        <Button type="button" variant="outline" onClick={onApply} disabled={busy}>
          {busy ? "正在应用..." : "应用当前推荐"}
        </Button>
      </div>
    </section>
  );
}
