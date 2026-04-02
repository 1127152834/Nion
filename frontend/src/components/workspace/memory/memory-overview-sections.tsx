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
    <article className="rounded-2xl border bg-background/80 p-4 shadow-sm">
      <div className="text-sm font-medium">{props.title}</div>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">
        {props.summary.trim() || props.emptyText}
      </div>
      {props.updatedAt ? (
        <div className="mt-3 text-xs text-muted-foreground">
          {formatTimeAgo(props.updatedAt)}
        </div>
      ) : null}
      <button
        type="button"
        className="mt-4 text-sm font-medium text-primary"
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
    kind: "user-context" | "history",
    title: string,
    summary: string,
    updatedAt?: string,
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
        <div>
          <h2 className="text-lg font-semibold">
            {t.settings.memory.markdown.userContext}
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MemorySectionCard
            title={t.settings.memory.markdown.work}
            summary={memory.user.workContext.summary}
            updatedAt={memory.user.workContext.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() =>
              props.onOpenDetail(
                "user-context",
                t.settings.memory.markdown.work,
                memory.user.workContext.summary,
                memory.user.workContext.updatedAt,
              )
            }
          />
          <MemorySectionCard
            title={t.settings.memory.markdown.personal}
            summary={memory.user.personalContext.summary}
            updatedAt={memory.user.personalContext.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() =>
              props.onOpenDetail(
                "user-context",
                t.settings.memory.markdown.personal,
                memory.user.personalContext.summary,
                memory.user.personalContext.updatedAt,
              )
            }
          />
          <MemorySectionCard
            title={t.settings.memory.markdown.topOfMind}
            summary={memory.user.topOfMind.summary}
            updatedAt={memory.user.topOfMind.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() =>
              props.onOpenDetail(
                "user-context",
                t.settings.memory.markdown.topOfMind,
                memory.user.topOfMind.summary,
                memory.user.topOfMind.updatedAt,
              )
            }
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">
            {t.settings.memory.markdown.historyBackground}
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MemorySectionCard
            title={t.settings.memory.markdown.recentMonths}
            summary={memory.history.recentMonths.summary}
            updatedAt={memory.history.recentMonths.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() =>
              props.onOpenDetail(
                "history",
                t.settings.memory.markdown.recentMonths,
                memory.history.recentMonths.summary,
                memory.history.recentMonths.updatedAt,
              )
            }
          />
          <MemorySectionCard
            title={t.settings.memory.markdown.earlierContext}
            summary={memory.history.earlierContext.summary}
            updatedAt={memory.history.earlierContext.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() =>
              props.onOpenDetail(
                "history",
                t.settings.memory.markdown.earlierContext,
                memory.history.earlierContext.summary,
                memory.history.earlierContext.updatedAt,
              )
            }
          />
          <MemorySectionCard
            title={t.settings.memory.markdown.longTermBackground}
            summary={memory.history.longTermBackground.summary}
            updatedAt={memory.history.longTermBackground.updatedAt}
            emptyText={emptyText}
            onOpenDetail={() =>
              props.onOpenDetail(
                "history",
                t.settings.memory.markdown.longTermBackground,
                memory.history.longTermBackground.summary,
                memory.history.longTermBackground.updatedAt,
              )
            }
          />
        </div>
      </section>
    </div>
  );
}
