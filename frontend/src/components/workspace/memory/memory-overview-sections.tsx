"use client";

import { useI18n } from "@/core/i18n/hooks";
import type { UserMemory } from "@/core/memory/types";
import { formatTimeAgo } from "@/core/utils/datetime";

function MemorySectionCard(props: {
  title: string;
  summary: string;
  updatedAt?: string;
  emptyText: string;
  onOpenDetail: () => void;
}) {
  return (
    <article className="flex min-h-[214px] flex-col rounded-lg border bg-background px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[1.15rem] font-semibold tracking-tight">{props.title}</div>
        <div className="text-xs text-muted-foreground">
          {props.updatedAt ? formatTimeAgo(props.updatedAt) : "暂无"}
        </div>
      </div>
      <div className="mt-6 flex-1 text-sm leading-7 text-foreground/80">
        {props.summary.trim() || props.emptyText}
      </div>
      <button
        type="button"
        className="mt-6 border-t pt-4 text-left text-sm font-semibold text-foreground"
        onClick={props.onOpenDetail}
      >
        查看详情
      </button>
    </article>
  );
}

export function MemoryOverviewSections(props: {
  memory: UserMemory | null;
  onOpenDetail: (
    section: "user" | "history",
    leaf:
      | "work"
      | "personal"
      | "topOfMind"
      | "recentMonths"
      | "earlierContext"
      | "longTermBackground",
  ) => void;
}) {
  const { t } = useI18n();
  const memory = props.memory;
  const emptyText = t.settings.memory.emptySectionText;

  if (!memory) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[1.7rem] font-semibold tracking-tight">
            {t.settings.memory.markdown.userContext}
          </h2>
          <div className="text-sm text-muted-foreground">
            所有卡片统一高度、统一标题线、统一底部动作位
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MemorySectionCard
            title={t.settings.memory.markdown.work}
            summary={memory.user.workContext.summary}
            updatedAt={memory.user.workContext.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() => props.onOpenDetail("user", "work")}
          />
          <MemorySectionCard
            title={t.settings.memory.markdown.personal}
            summary={memory.user.personalContext.summary}
            updatedAt={memory.user.personalContext.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() => props.onOpenDetail("user", "personal")}
          />
          <MemorySectionCard
            title={t.settings.memory.markdown.topOfMind}
            summary={memory.user.topOfMind.summary}
            updatedAt={memory.user.topOfMind.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() => props.onOpenDetail("user", "topOfMind")}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-[1.7rem] font-semibold tracking-tight">
            {t.settings.memory.markdown.historyBackground}
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MemorySectionCard
            title={t.settings.memory.markdown.recentMonths}
            summary={memory.history.recentMonths.summary}
            updatedAt={memory.history.recentMonths.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() => props.onOpenDetail("history", "recentMonths")}
          />
          <MemorySectionCard
            title={t.settings.memory.markdown.earlierContext}
            summary={memory.history.earlierContext.summary}
            updatedAt={memory.history.earlierContext.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() => props.onOpenDetail("history", "earlierContext")}
          />
          <MemorySectionCard
            title={t.settings.memory.markdown.longTermBackground}
            summary={memory.history.longTermBackground.summary}
            updatedAt={memory.history.longTermBackground.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() =>
              props.onOpenDetail("history", "longTermBackground")
            }
          />
        </div>
      </section>
    </div>
  );
}
