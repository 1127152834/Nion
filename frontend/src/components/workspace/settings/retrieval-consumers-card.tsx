"use client";

import { AlertTriangleIcon, DatabaseIcon, FileSearchIcon } from "lucide-react";

import type { RetrievalModelsConsumerStatus } from "@/core/retrieval-models/types";

export interface RetrievalConsumersCardProps {
  consumers: RetrievalModelsConsumerStatus[];
}

function iconForConsumer(consumerId: string) {
  if (consumerId === "memory") {
    return DatabaseIcon;
  }
  return FileSearchIcon;
}

function stateCopy(item: RetrievalModelsConsumerStatus) {
  if (item.rebuild_required) {
    return "需要重建索引";
  }
  if (item.index_state === "ready") {
    return "已就绪";
  }
  if (item.index_state === "unknown") {
    return "等待首次校验";
  }
  return item.index_state;
}

export function RetrievalConsumersCard({
  consumers,
}: RetrievalConsumersCardProps) {
  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
      <div className="space-y-1">
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Consumers
        </div>
        <h3 className="text-lg font-semibold text-slate-900">谁在使用这套检索能力</h3>
        <p className="text-sm leading-6 text-slate-600">
          这里展示的是业务侧受影响的模块，而不是底层向量库细节。看这个，就知道你改完会影响谁。
        </p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {consumers.map((item) => {
          const Icon = iconForConsumer(item.consumer_id);
          const needsAttention = item.rebuild_required;
          return (
            <div
              key={item.consumer_id}
              className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-white bg-white p-2.5">
                    <Icon className="size-4 text-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                    <div className="text-sm text-slate-600">{stateCopy(item)}</div>
                  </div>
                </div>

                {needsAttention ? (
                  <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    <AlertTriangleIcon className="size-3.5" />
                    待处理
                  </div>
                ) : (
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    正常
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
