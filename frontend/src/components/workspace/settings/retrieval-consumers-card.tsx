"use client";

import type { RetrievalModelsConsumerStatus } from "@/core/retrieval-models/types";

export interface RetrievalConsumersCardProps {
  consumers: RetrievalModelsConsumerStatus[];
}

export function RetrievalConsumersCard({
  consumers,
}: RetrievalConsumersCardProps) {
  return (
    <section className="space-y-2 rounded-xl border bg-muted/30 p-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold">消费方</div>
        <div className="text-muted-foreground text-xs">当前检索能力消费者</div>
      </div>
      <div className="space-y-1 text-sm">
        {consumers.map((item) => (
          <div key={item.consumer_id}>{item.label}</div>
        ))}
      </div>
    </section>
  );
}
