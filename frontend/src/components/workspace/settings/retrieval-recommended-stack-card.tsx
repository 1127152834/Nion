"use client";

import { ArrowRightIcon, SparklesIcon, WandSparklesIcon } from "lucide-react";

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
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(244,247,255,0.94),rgba(240,249,255,0.9))] shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]">
      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            <SparklesIcon className="size-3.5" />
            推荐组合
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              先用系统推荐，别一上来就研究那些参数。
            </h2>
            <p className="max-w-[42ch] text-sm leading-7 text-slate-600">
              这套组合优先保证“普通用户能直接用”。保存后，记忆和知识检索会共用同一套语义理解与精排能力。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/80 bg-white/80 p-4">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                语义理解
              </div>
              <div className="mt-2 text-base font-semibold text-slate-900">{embeddingModel}</div>
            </div>
            <div className="rounded-[22px] border border-white/80 bg-white/80 p-4">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                结果精排
              </div>
              <div className="mt-2 text-base font-semibold text-slate-900">{rerankerModel}</div>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col justify-between rounded-[24px] border border-slate-200/70 bg-white/75 p-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <WandSparklesIcon className="size-4 text-amber-500" />
              当前覆盖
            </div>
            <div className="text-4xl font-semibold tracking-tight text-slate-950">{consumerCount}</div>
            <div className="text-sm leading-6 text-slate-600">
              个检索消费者会直接吃这套配置。你改一次，Memory 和 Knowledge Base 都会一起切换。
            </div>
          </div>

          <Button type="button" className="mt-6 justify-between" onClick={onApply} disabled={busy}>
            {busy ? "正在应用推荐..." : "应用推荐组合"}
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
