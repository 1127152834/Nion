"use client";

import { toast } from "sonner";

import {
  useFreezeMemoryGrowthItem,
  useMemoryGrowth,
  useRejectMemoryGrowthItem,
} from "@/core/memory-growth/hooks";

function Section(props: {
  title: string;
  items: { memory_id: string; title?: string | null; summary: string }[];
  empty: string;
  onFreeze: (memoryId: string) => void;
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
            <li key={item.memory_id} className="text-sm leading-6">
              <div className="font-medium">{item.title || "未命名条目"}</div>
              <div className="text-muted-foreground">{item.summary}</div>
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-foreground"
                  onClick={() => props.onFreeze(item.memory_id)}
                >
                  冻结
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-foreground"
                  onClick={() => props.onReject(item.memory_id)}
                >
                  拒绝
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function MemoryGrowthPanel() {
  const { growth, isLoading, error } = useMemoryGrowth();
  const freeze = useFreezeMemoryGrowthItem();
  const reject = useRejectMemoryGrowthItem();

  async function handleFreeze(memoryId: string) {
    try {
      await freeze.mutateAsync(memoryId);
      toast.success("已冻结该成长项");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "冻结失败");
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
          这里展示记忆系统已经形成的学习主题、方法草案和灵魂提案。
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Section
          title="学习主题"
          items={growth.learning}
          empty="当前还没有学习主题。"
          onFreeze={(memoryId) => void handleFreeze(memoryId)}
          onReject={(memoryId) => void handleReject(memoryId)}
        />
        <Section
          title="方法草案"
          items={growth.procedures}
          empty="当前还没有方法草案。"
          onFreeze={(memoryId) => void handleFreeze(memoryId)}
          onReject={(memoryId) => void handleReject(memoryId)}
        />
        <Section
          title="灵魂提案"
          items={growth.soul_proposals}
          empty="当前还没有灵魂提案。"
          onFreeze={(memoryId) => void handleFreeze(memoryId)}
          onReject={(memoryId) => void handleReject(memoryId)}
        />
      </div>
    </section>
  );
}
