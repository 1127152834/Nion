"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/core/i18n/hooks";
import {
  useClearMemory,
  useDeleteMemoryFact,
  useMemory,
} from "@/core/memory/hooks";
import {
  searchStructuredMemory,
  type StructuredMemorySearchLabels,
} from "@/core/memory/search";
import type { UserMemory } from "@/core/memory/types";
import { useRecallSearch } from "@/core/recall/hooks";
import { formatTimeAgo } from "@/core/utils/datetime";

import { MemoryConsolePanel } from "../settings/memory-console-panel";
import { MemoryClearFlow } from "./memory-clear-flow";
import {
  type MemoryDetailKind,
  MemoryDetailDrawer,
} from "./memory-detail-drawer";
import { MemoryOverviewSections } from "./memory-overview-sections";
import { MemorySummaryCards } from "./memory-summary-cards";

type MemoryViewFilter = "all" | "facts" | "summaries";

type MemorySection = {
  title: string;
  summary: string;
  updatedAt?: string;
};

type MemorySectionGroup = {
  title: string;
  sections: MemorySection[];
};

function buildMemorySectionGroups(
  memory: UserMemory,
  t: ReturnType<typeof useI18n>["t"],
): MemorySectionGroup[] {
  return [
    {
      title: t.settings.memory.markdown.userContext,
      sections: [
        {
          title: t.settings.memory.markdown.work,
          summary: memory.user.workContext.summary,
          updatedAt: memory.user.workContext.updatedAt,
        },
        {
          title: t.settings.memory.markdown.personal,
          summary: memory.user.personalContext.summary,
          updatedAt: memory.user.personalContext.updatedAt,
        },
        {
          title: t.settings.memory.markdown.topOfMind,
          summary: memory.user.topOfMind.summary,
          updatedAt: memory.user.topOfMind.updatedAt,
        },
      ],
    },
    {
      title: t.settings.memory.markdown.historyBackground,
      sections: [
        {
          title: t.settings.memory.markdown.recentMonths,
          summary: memory.history.recentMonths.summary,
          updatedAt: memory.history.recentMonths.updatedAt,
        },
        {
          title: t.settings.memory.markdown.earlierContext,
          summary: memory.history.earlierContext.summary,
          updatedAt: memory.history.earlierContext.updatedAt,
        },
        {
          title: t.settings.memory.markdown.longTermBackground,
          summary: memory.history.longTermBackground.summary,
          updatedAt: memory.history.longTermBackground.updatedAt,
        },
      ],
    },
  ];
}

export function MemoryPage() {
  const { t } = useI18n();
  const { memory, isLoading, error } = useMemory();
  const clearMemory = useClearMemory();
  const deleteMemoryFact = useDeleteMemoryFact();
  const [clearFlowOpen, setClearFlowOpen] = useState(false);
  const [clearSuccessBanner, setClearSuccessBanner] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailKind, setDetailKind] = useState<MemoryDetailKind>("user-context");
  const [detailTitle, setDetailTitle] = useState("");
  const [detailSummary, setDetailSummary] = useState("");
  const [detailUpdatedAt, setDetailUpdatedAt] = useState<string | undefined>();
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemoryViewFilter>("all");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const recall = useRecallSearch(submittedQuery, 5);

  const searchLabels = useMemo<StructuredMemorySearchLabels>(
    () => ({
      work: t.settings.memory.markdown.work,
      personal: t.settings.memory.markdown.personal,
      topOfMind: t.settings.memory.markdown.topOfMind,
      recentMonths: t.settings.memory.markdown.recentMonths,
      earlierContext: t.settings.memory.markdown.earlierContext,
      longTermBackground: t.settings.memory.markdown.longTermBackground,
      facts: t.settings.memory.markdown.facts,
    }),
    [
      t.settings.memory.markdown.work,
      t.settings.memory.markdown.personal,
      t.settings.memory.markdown.topOfMind,
      t.settings.memory.markdown.recentMonths,
      t.settings.memory.markdown.earlierContext,
      t.settings.memory.markdown.longTermBackground,
      t.settings.memory.markdown.facts,
    ],
  );

  const structuredResults = useMemo(
    () =>
      memory && submittedQuery
        ? searchStructuredMemory(memory, submittedQuery, searchLabels)
        : [],
    [memory, searchLabels, submittedQuery],
  );

  const sectionGroups = useMemo(
    () => (memory ? buildMemorySectionGroups(memory, t) : []),
    [memory, t],
  );

  const filteredSectionGroups = useMemo(
    () =>
      sectionGroups
        .map((group) => ({
          ...group,
          sections: group.sections.filter((section) =>
            normalizedQuery
              ? `${section.title} ${section.summary}`
                  .toLowerCase()
                  .includes(normalizedQuery)
              : true,
          ),
        }))
        .filter((group) => group.sections.length > 0),
    [normalizedQuery, sectionGroups],
  );

  const filteredFacts = useMemo(
    () =>
      memory
        ? memory.facts.filter((fact) =>
            normalizedQuery
              ? `${fact.content} ${fact.category}`
                  .toLowerCase()
                  .includes(normalizedQuery)
              : true,
          )
        : [],
    [memory, normalizedQuery],
  );

  const showSummaries = filter !== "facts";
  const showFacts = filter !== "summaries";
  const hasMatchingVisibleContent =
    !memory ||
    (showSummaries && filteredSectionGroups.length > 0) ||
    (showFacts && filteredFacts.length > 0);

  const lastUpdatedLabel = formatTimeAgo(memory?.lastUpdated);
  const affectedSections = [
    t.settings.memory.markdown.userContext,
    t.settings.memory.markdown.historyBackground,
    t.settings.memory.markdown.facts,
  ];

  async function handleConfirmClearMemory() {
    try {
      await clearMemory.mutateAsync();
      setClearSuccessBanner(true);
      toast.success(t.settings.memory.clearAllSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function openDetail(
    kind: MemoryDetailKind,
    title: string,
    summary: string,
    updatedAt?: string,
  ) {
    setDetailKind(kind);
    setDetailTitle(title);
    setDetailSummary(summary);
    setDetailUpdatedAt(updatedAt);
    setDetailOpen(true);
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
        <header className="space-y-4">
          <div className="rounded-2xl border bg-background/80 p-6 shadow-sm">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {t.workspaceSurfaces.memory.eyebrow}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t.workspaceSurfaces.memory.title}
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {t.workspaceSurfaces.memory.description}
              </p>
            </div>

            {clearSuccessBanner ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {t.settings.memory.clearAllSuccess}
              </div>
            ) : null}

            <div className="mt-5">
              <MemorySummaryCards memory={memory} />
            </div>
          </div>
        </header>

        <section className="rounded-2xl border bg-background/80 p-5 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">
              {t.settings.memory.quickSearchTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.settings.memory.quickSearchDescription}
            </p>
          </div>

          <div className="mt-4">
            <MemoryConsolePanel
              memory={memory}
              isLoading={isLoading}
              error={error instanceof Error ? error : null}
              draftQuery={draftQuery}
              submittedQuery={submittedQuery}
              onDraftQueryChange={setDraftQuery}
              onSubmitSearch={() => setSubmittedQuery(draftQuery.trim())}
              structuredResults={structuredResults}
              recall={recall}
              query={query}
              filter={filter}
              filteredFacts={filteredFacts}
              filteredSectionGroups={filteredSectionGroups}
              hasMatchingVisibleContent={hasMatchingVisibleContent}
              normalizedQuery={normalizedQuery}
              onQueryChange={setQuery}
              onFilterChange={setFilter}
              onOpenDangerZone={() => setClearFlowOpen(true)}
              onDeleteFact={(fact) => {
                void deleteMemoryFact.mutateAsync(fact.id);
              }}
            />
          </div>
        </section>

        <section>
          <MemoryOverviewSections memory={memory} onOpenDetail={openDetail} />
        </section>
      </div>

      <MemoryClearFlow
        open={clearFlowOpen}
        factsCount={memory?.facts.length ?? 0}
        lastUpdatedLabel={lastUpdatedLabel}
        affectedSections={affectedSections}
        pending={clearMemory.isPending}
        onOpenChange={setClearFlowOpen}
        onConfirm={handleConfirmClearMemory}
      />

      <MemoryDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        kind={detailKind}
        title={detailTitle}
        summary={detailSummary}
        updatedAt={detailUpdatedAt}
        memory={memory}
        facts={memory?.facts ?? []}
      />
    </>
  );
}
