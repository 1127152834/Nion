"use client";

import { ListChecksIcon, SearchCheckIcon, ServerCogIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  RetrievalCapabilitySnapshot,
  RetrievalRerankerProfile,
} from "@/core/retrieval-models/types";

export interface RetrievalRerankerDraft {
  endpoint: string;
  apiKey: string;
  modelName: string;
}

export interface RetrievalRerankerCardProps {
  reranker: RetrievalRerankerProfile;
  capability: RetrievalCapabilitySnapshot;
  draft: RetrievalRerankerDraft;
  busy: boolean;
  testBusy: boolean;
  rebuildBusy: boolean;
  testSummary: string | null;
  onDraftChange: (patch: Partial<RetrievalRerankerDraft>) => void;
  onSave: () => void;
  onTest: () => void;
  onRebuild: () => void;
}

export function RetrievalRerankerCard({
  reranker,
  capability,
  draft,
  busy,
  testBusy,
  rebuildBusy,
  testSummary,
  onDraftChange,
  onSave,
  onTest,
  onRebuild,
}: RetrievalRerankerCardProps) {
  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Reranker
          </div>
          <h3 className="text-lg font-semibold text-slate-900">结果精排模型</h3>
          <p className="max-w-[34ch] text-sm leading-6 text-slate-600">
            负责把召回结果重新排序，让最相关的记忆和知识先浮上来。它影响的是“准不准”，不是“记不记得”。
          </p>
        </div>

        <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          {reranker.api_key_configured ? "可直接测试" : "先补充密钥"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-[20px] bg-slate-50 p-4 sm:grid-cols-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <SparklesIcon className="size-3.5" />
            当前模型
          </div>
          <div className="text-sm font-semibold text-slate-900">{reranker.model_name}</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <ServerCogIcon className="size-3.5" />
            接口状态
          </div>
          <div className="text-sm font-semibold text-slate-900">
            {reranker.endpoint ? "已填写接口地址" : "未填写接口地址"}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <ListChecksIcon className="size-3.5" />
            排序能力
          </div>
          <div className="text-sm font-semibold text-slate-900">已纳入记忆与知识检索</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-800">接口地址</span>
          <Input
            value={draft.endpoint}
            onChange={(event) => onDraftChange({ endpoint: event.target.value })}
            placeholder="https://provider.example.com/v1/rerank"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-800">模型名称</span>
          <Input
            value={draft.modelName}
            onChange={(event) => onDraftChange({ modelName: event.target.value })}
            placeholder="bge-reranker-large"
          />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-slate-800">接口密钥</span>
          <Input
            type="password"
            value={draft.apiKey}
            onChange={(event) => onDraftChange({ apiKey: event.target.value })}
            placeholder={reranker.api_key_configured ? "留空则保持当前密钥" : "请输入 API Key"}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onSave} disabled={!capability.remote_config_enabled || busy}>
          {busy ? "正在保存..." : "保存并启用"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onTest}
          disabled={!capability.test_enabled || testBusy}
        >
          {testBusy ? "测试中..." : "测试排序"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onRebuild}
          disabled={!capability.rebuild_enabled || rebuildBusy}
        >
          {rebuildBusy ? "提交中..." : "重建相关索引"}
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        <div className="flex items-center gap-2 font-medium text-slate-800">
          <SearchCheckIcon className="size-4 text-sky-600" />
          使用提示
        </div>
        <div className="mt-1 leading-6">
          调整排序模型后，建议立刻点一次“测试排序”，再视情况重建记忆和知识检索索引。{testSummary ?? "如果你不清楚该填什么，直接使用推荐组合即可。"}
        </div>
      </div>
    </section>
  );
}
