"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  describeMemoryGrowthDomain,
  describeMemoryGrowthStatus,
  listMemoryGrowthActions,
} from "@/core/memory-growth/presentation";
import type { MemoryGrowthItemV2 } from "@/core/memory-growth-v2/types";
import {
  useAcceptMemoryGrowthItemV2,
  useFreezeMemoryGrowthItemV2,
  useMemoryGrowthV2,
  useRejectMemoryGrowthItemV2,
  useResumeMemoryGrowthItemV2,
} from "@/core/memory-growth-v2/hooks";

import { SoulGrowthTimeline } from "./soul-growth-timeline";
import { SoulProposalList } from "./soul-proposal-list";

function Section(props: {
  title: string;
  items: MemoryGrowthItemV2[];
  empty: string;
  onAccept: (memoryId: string) => void;
  onFreeze: (memoryId: string) => void;
  onResume: (memoryId: string) => void;
  onReject: (memoryId: string) => void;
}) {
  return (
    <article className="rounded-lg border bg-background px-5 py-4">
      <div className="text-[1.05rem] font-semibold tracking-tight">{props.title}</div>
      {props.items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{props.empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {props.items.map((item) => (
            <li
              key={item.memory_id}
              className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm leading-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{item.title || "未命名条目"}</div>
                <Badge variant={describeMemoryGrowthStatus(item.status).variant}>
                  {describeMemoryGrowthStatus(item.status).label}
                </Badge>
              </div>
              <div className="mt-2 text-muted-foreground">{item.summary}</div>
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                {describeMemoryGrowthDomain(item.domain).explanation}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {listMemoryGrowthActions(item).includes("accept") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => props.onAccept(item.memory_id)}
                  >
                    接受
                  </Button>
                ) : null}
                {listMemoryGrowthActions(item).includes("freeze") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => props.onFreeze(item.memory_id)}
                  >
                    冻结
                  </Button>
                ) : null}
                {listMemoryGrowthActions(item).includes("resume") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => props.onResume(item.memory_id)}
                  >
                    恢复
                  </Button>
                ) : null}
                {listMemoryGrowthActions(item).includes("reject") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => props.onReject(item.memory_id)}
                  >
                    拒绝
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function MemoryGrowthPanel() {
  const { growth, isLoading, error } = useMemoryGrowthV2();
  const accept = useAcceptMemoryGrowthItemV2();
  const freeze = useFreezeMemoryGrowthItemV2();
  const resume = useResumeMemoryGrowthItemV2();
  const reject = useRejectMemoryGrowthItemV2();
  const [lastAcceptedProposalId, setLastAcceptedProposalId] = useState<string | null>(null);
  const [lastRejectedProposalId, setLastRejectedProposalId] = useState<string | null>(null);

  async function handleAccept(memoryId: string) {
    try {
      await accept.mutateAsync(memoryId);
      toast.success("已接受该成长项");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "接受失败");
    }
  }

  async function handleFreeze(memoryId: string) {
    try {
      await freeze.mutateAsync(memoryId);
      toast.success("已冻结该成长项");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "冻结失败");
    }
  }

  async function handleResume(memoryId: string) {
    try {
      await resume.mutateAsync(memoryId);
      toast.success("已恢复该成长项");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "恢复失败");
    }
  }

  async function handleReject(memoryId: string) {
    try {
      await reject.mutateAsync(memoryId);
      toast.success("已拒绝该成长项");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "拒绝失败");
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border bg-background px-5 py-4 text-sm text-muted-foreground">
        正在加载成长状态…
      </section>
    );
  }

  if (error || !growth) {
    return (
      <section className="rounded-lg border bg-background px-5 py-4 text-sm text-muted-foreground">
        暂时无法读取成长状态。
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[1.7rem] font-semibold tracking-tight">Agent Growth</h2>
        <p className="text-sm text-muted-foreground">
          这里展示记忆系统已经形成的学习主题、方法草案和灵魂提案。不同类型的条目只会开放与其治理语义一致的动作。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">候选中</Badge>
          <Badge variant="default">已生效</Badge>
          <Badge variant="outline">已冻结</Badge>
          <Badge variant="destructive">已拒绝</Badge>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Section
          title="学习主题"
          items={growth.learning}
          empty="当前还没有学习主题。"
          onAccept={(memoryId) => void handleAccept(memoryId)}
          onFreeze={(memoryId) => void handleFreeze(memoryId)}
          onResume={(memoryId) => void handleResume(memoryId)}
          onReject={(memoryId) => void handleReject(memoryId)}
        />
        <Section
          title="方法草案"
          items={growth.procedures}
          empty="当前还没有方法草案。"
          onAccept={(memoryId) => void handleAccept(memoryId)}
          onFreeze={(memoryId) => void handleFreeze(memoryId)}
          onResume={(memoryId) => void handleResume(memoryId)}
          onReject={(memoryId) => void handleReject(memoryId)}
        />
        <Section
          title="灵魂提案"
          items={growth.soul_proposals}
          empty="当前还没有灵魂提案。"
          onAccept={(memoryId) => void handleAccept(memoryId)}
          onFreeze={(memoryId) => void handleFreeze(memoryId)}
          onResume={(memoryId) => void handleResume(memoryId)}
          onReject={(memoryId) => void handleReject(memoryId)}
        />
      </div>
      <SoulGrowthTimeline
        lastAcceptedProposalId={lastAcceptedProposalId}
        lastRejectedProposalId={lastRejectedProposalId}
      />
      <SoulProposalList
        onProposalEvent={({ lastAcceptedProposalId, lastRejectedProposalId }) => {
          setLastAcceptedProposalId(lastAcceptedProposalId);
          setLastRejectedProposalId(lastRejectedProposalId);
        }}
      />
    </section>
  );
}
