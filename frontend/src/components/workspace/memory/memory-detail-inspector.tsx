"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/core/i18n/hooks";
import type { UserMemory } from "@/core/memory/types";
import { formatTimeAgo } from "@/core/utils/datetime";

import type { MemoryDetailKind } from "./memory-detail-drawer";

function relatedSummaryTerms(summary: string) {
  return Array.from(
    new Set(
      summary
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2),
    ),
  );
}

export function MemoryDetailInspector(props: {
  kind: MemoryDetailKind;
  title: string;
  summary: string;
  updatedAt?: string;
  memory: UserMemory | null;
  facts: UserMemory["facts"];
}) {
  const { t } = useI18n();
  const summaryTerms = relatedSummaryTerms(props.summary);
  const relatedFacts = props.facts.filter((fact) => {
    if (props.kind === "history") return false;
    if (summaryTerms.length === 0) return true;
    const haystack = `${fact.content} ${fact.category}`.toLowerCase();
    return summaryTerms.some((term) => haystack.includes(term));
  });

  return (
    <aside className="border bg-background">
      <div className="border-b px-4 py-3">
        <div className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          Detail inspector
        </div>
        <div className="mt-1.5 text-[1.5rem] font-semibold tracking-tight">
          {props.title}
        </div>
      </div>

      <div className="space-y-3 px-3 py-3">
        <section className="border bg-background p-3">
          <div className="text-sm font-medium text-muted-foreground">
            {t.settings.memory.detailSummaryTitle}
          </div>
          <div className="mt-2 text-sm leading-6.5">
            {props.summary || t.settings.memory.emptySectionText}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {props.updatedAt
              ? formatTimeAgo(props.updatedAt)
              : t.settings.memory.notAvailable}
          </div>
        </section>

        {props.kind === "history" ? (
          <section className="space-y-3">
            <div className="text-base font-semibold">
              {t.settings.memory.detailTimelineTitle}
            </div>
            <div className="space-y-3">
              {[
                {
                  key: "recentMonths",
                  title: t.settings.memory.markdown.recentMonths,
                  summary: props.memory?.history.recentMonths.summary ?? "",
                  updatedAt: props.memory?.history.recentMonths.updatedAt,
                },
                {
                  key: "earlierContext",
                  title: t.settings.memory.markdown.earlierContext,
                  summary: props.memory?.history.earlierContext.summary ?? "",
                  updatedAt: props.memory?.history.earlierContext.updatedAt,
                },
                {
                  key: "longTermBackground",
                  title: t.settings.memory.markdown.longTermBackground,
                  summary: props.memory?.history.longTermBackground.summary ?? "",
                  updatedAt: props.memory?.history.longTermBackground.updatedAt,
                },
              ].map((item) => (
                <div key={item.key} className="border bg-background p-3">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.updatedAt
                      ? formatTimeAgo(item.updatedAt)
                      : t.settings.memory.notAvailable}
                  </div>
                  <div className="mt-2 text-sm leading-6">
                    {item.summary || t.settings.memory.emptySectionText}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <div className="text-base font-semibold">
              {t.settings.memory.detailFactsTitle}
            </div>
            {relatedFacts.length === 0 ? (
              <div className="border bg-background p-3 text-sm text-muted-foreground">
                {t.settings.memory.noFacts}
              </div>
            ) : (
              <div className="space-y-3">
                {relatedFacts.map((fact) => (
                  <div key={fact.id} className="border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{fact.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(fact.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm leading-6">{fact.content}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </aside>
  );
}
