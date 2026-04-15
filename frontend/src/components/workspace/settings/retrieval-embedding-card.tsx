"use client";

import { CheckCircle2Icon, KeyRoundIcon, Link2Icon, RadarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  RetrievalCapabilitySnapshot,
  RetrievalEmbeddingProfile,
} from "@/core/retrieval-models/types";

export interface RetrievalEmbeddingDraft {
  endpoint: string;
  apiKey: string;
  modelName: string;
  dimensions: string;
}

export interface RetrievalEmbeddingCardProps {
  embedding: RetrievalEmbeddingProfile;
  capability: RetrievalCapabilitySnapshot;
  draft: RetrievalEmbeddingDraft;
  busy: boolean;
  testBusy: boolean;
  testSummary: string | null;
  onDraftChange: (patch: Partial<RetrievalEmbeddingDraft>) => void;
  onSave: () => void;
  onTest: () => void;
}

function readinessLabel(profile: RetrievalEmbeddingProfile) {
  return profile.api_key_configured ? "已接入" : "待补充密钥";
}

export function RetrievalEmbeddingCard({
  embedding,
  capability,
  draft,
  busy,
  testBusy,
  testSummary,
  onDraftChange,
  onSave,
  onTest,
}: RetrievalEmbeddingCardProps) {
  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Embedding
          </div>
          <h3 className="text-lg font-semibold text-slate-900">语义理解模型</h3>
          <p className="max-w-[34ch] text-sm leading-6 text-slate-600">
            负责把长期记忆和知识内容转成可检索的语义线索。这里只保留普通人看得懂的配置。
          </p>
        </div>

        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          {readinessLabel(embedding)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-[20px] bg-slate-50 p-4 sm:grid-cols-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <RadarIcon className="size-3.5" />
            当前模型
          </div>
          <div className="text-sm font-semibold text-slate-900">{embedding.model_name}</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <Link2Icon className="size-3.5" />
            接口状态
          </div>
          <div className="text-sm font-semibold text-slate-900">
            {embedding.endpoint ? "已填写接口地址" : "未填写接口地址"}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <KeyRoundIcon className="size-3.5" />
            密钥状态
          </div>
          <div className="text-sm font-semibold text-slate-900">
            {embedding.api_key_configured ? "已保存" : "尚未保存"}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-800">接口地址</span>
          <Input
            value={draft.endpoint}
            onChange={(event) => onDraftChange({ endpoint: event.target.value })}
            placeholder="https://provider.example.com/v1/embeddings"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-800">模型名称</span>
          <Input
            value={draft.modelName}
            onChange={(event) => onDraftChange({ modelName: event.target.value })}
            placeholder="text-embedding-3-large"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-800">接口密钥</span>
          <Input
            type="password"
            value={draft.apiKey}
            onChange={(event) => onDraftChange({ apiKey: event.target.value })}
            placeholder={embedding.api_key_configured ? "留空则保持当前密钥" : "请输入 API Key"}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-800">向量长度</span>
          <Input
            inputMode="numeric"
            value={draft.dimensions}
            onChange={(event) => onDraftChange({ dimensions: event.target.value })}
            placeholder="3072"
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
          {testBusy ? "测试中..." : "测试连接"}
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        <div className="flex items-center gap-2 font-medium text-slate-800">
          <CheckCircle2Icon className="size-4 text-emerald-600" />
          使用提示
        </div>
        <div className="mt-1 leading-6">
          保存后，记忆与知识检索会统一切到这套语义理解配置。{testSummary ?? "你也可以先点“测试连接”，确认接口能正常返回向量结果。"}
        </div>
      </div>
    </section>
  );
}
