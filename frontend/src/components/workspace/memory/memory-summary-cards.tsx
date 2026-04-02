"use client";

import { useI18n } from "@/core/i18n/hooks";
import type { UserMemory } from "@/core/memory/types";
import { formatTimeAgo } from "@/core/utils/datetime";

function hasMeaningfulSummary(values: Array<{ summary: string }>) {
  return values.some((item) => item.summary.trim() !== "");
}

export function MemorySummaryCards(props: { memory: UserMemory | null }) {
  const { t } = useI18n();
  const memory = props.memory;

  const userContextReady = memory
    ? hasMeaningfulSummary([
        memory.user.workContext,
        memory.user.personalContext,
        memory.user.topOfMind,
      ])
    : false;

  const historyReady = memory
    ? hasMeaningfulSummary([
        memory.history.recentMonths,
        memory.history.earlierContext,
        memory.history.longTermBackground,
      ])
    : false;

  const cards = [
    {
      label: t.settings.memory.summaryCards.factCount,
      value: String(memory?.facts.length ?? 0),
    },
    {
      label: t.settings.memory.summaryCards.lastUpdated,
      value:
        formatTimeAgo(memory?.lastUpdated) ?? t.settings.memory.notAvailable,
    },
    {
      label: t.settings.memory.summaryCards.userContext,
      value: userContextReady
        ? t.settings.memory.summaryCards.ready
        : t.settings.memory.summaryCards.empty,
    },
    {
      label: t.settings.memory.summaryCards.historyBackground,
      value: historyReady
        ? t.settings.memory.summaryCards.ready
        : t.settings.memory.summaryCards.empty,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-2xl border bg-background/80 p-4 shadow-sm"
        >
          <div className="text-xs text-muted-foreground">{card.label}</div>
          <div className="mt-2 text-xl font-semibold">{card.value}</div>
        </article>
      ))}
    </div>
  );
}
