"use client";

import type { RetrievalModelsConsumerStatus } from "@/core/retrieval-models/types";

export interface RetrievalConsumersCardProps {
  consumers: RetrievalModelsConsumerStatus[];
}

function stateCopy(item: RetrievalModelsConsumerStatus) {
  if (item.rebuild_required) {
    return "需要重建";
  }
  if (item.index_state === "ready") {
    return "已就绪";
  }
  if (item.index_state === "unknown") {
    return "等待校验";
  }
  return item.index_state;
}

export function RetrievalConsumersCard({
  consumers,
}: RetrievalConsumersCardProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="space-y-1">
        <div className="text-sm font-medium">影响模块</div>
        <div className="text-muted-foreground text-sm">
          这里显示哪些模块会直接使用当前检索配置。
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {consumers.map((item) => (
          <div
            key={item.consumer_id}
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-3"
          >
            <div className="text-sm font-medium">{item.label}</div>
            <div className="text-muted-foreground text-sm">{stateCopy(item)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
