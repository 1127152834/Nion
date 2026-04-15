"use client";

import type { RetrievalModelsConsumerStatus } from "@/core/retrieval-models/types";

export interface RetrievalConsumersCardProps {
  consumers: RetrievalModelsConsumerStatus[];
}

export function RetrievalConsumersCard({
  consumers,
}: RetrievalConsumersCardProps) {
  return (
    <div className="text-muted-foreground text-sm">
      当前检索配置会被 {consumers.map((item) => item.label).join("、")} 直接使用。
    </div>
  );
}
