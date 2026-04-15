"use client";

export interface RetrievalRecommendedStackCardProps {
  embeddingModel: string;
  rerankerModel: string;
  consumerCount: number;
}

export function RetrievalRecommendedStackCard({
  embeddingModel,
  rerankerModel,
  consumerCount,
}: RetrievalRecommendedStackCardProps) {
  return (
    <section className="space-y-2 rounded-xl border bg-muted/30 p-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold">推荐组合</div>
        <div className="text-muted-foreground text-xs">Phase 1 retrieval stack</div>
      </div>
      <div className="space-y-1 text-sm">
        <div>{embeddingModel}</div>
        <div>{rerankerModel}</div>
        <div className="text-muted-foreground text-xs">
          覆盖 {consumerCount} 个消费者
        </div>
      </div>
    </section>
  );
}
