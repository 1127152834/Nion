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
import { MemoryDetailInspector } from "./memory-detail-inspector";
import {
  MemoryMapNav,
  type MemoryMapLeaf,
  type MemoryMapSection,
} from "./memory-map-nav";
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

function resolveSelectedMemoryDetail(input: {
  activeSection: MemoryMapSection;
  activeLeaf: MemoryMapLeaf;
  memory: UserMemory | null;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const { activeSection, activeLeaf, memory, t } = input;

  if (!memory) {
    return {
      kind: "user-context" as MemoryDetailKind,
      title: t.settings.memory.markdown.personal,
      summary: "",
      updatedAt: undefined as string | undefined,
    };
  }

  if (activeSection === "user") {
    const map = {
      work: {
        title: t.settings.memory.markdown.work,
        summary: memory.user.workContext.summary,
        updatedAt: memory.user.workContext.updatedAt,
      },
      personal: {
        title: t.settings.memory.markdown.personal,
        summary: memory.user.personalContext.summary,
        updatedAt: memory.user.personalContext.updatedAt,
      },
      topOfMind: {
        title: t.settings.memory.markdown.topOfMind,
        summary: memory.user.topOfMind.summary,
        updatedAt: memory.user.topOfMind.updatedAt,
      },
    } as const;

    const detail = map[activeLeaf as keyof typeof map] ?? map.personal;
    return {
      kind: "user-context" as MemoryDetailKind,
      title: detail.title,
      summary: detail.summary,
      updatedAt: detail.updatedAt,
    };
  }

  if (activeSection === "history") {
    const map = {
      recentMonths: {
        title: t.settings.memory.markdown.recentMonths,
        summary: memory.history.recentMonths.summary,
        updatedAt: memory.history.recentMonths.updatedAt,
      },
      earlierContext: {
        title: t.settings.memory.markdown.earlierContext,
        summary: memory.history.earlierContext.summary,
        updatedAt: memory.history.earlierContext.updatedAt,
      },
      longTermBackground: {
        title: t.settings.memory.markdown.longTermBackground,
        summary: memory.history.longTermBackground.summary,
        updatedAt: memory.history.longTermBackground.updatedAt,
      },
    } as const;

    const detail = map[activeLeaf as keyof typeof map] ?? map.recentMonths;
    return {
      kind: "history" as MemoryDetailKind,
      title: detail.title,
      summary: detail.summary,
      updatedAt: detail.updatedAt,
    };
  }

  return {
    kind: "facts" as MemoryDetailKind,
    title: t.settings.memory.markdown.facts,
    summary: "",
    updatedAt: memory.lastUpdated,
  };
}

export function MemoryPage() {
  const { t } = useI18n();
  const { memory, isLoading, error } = useMemory();
  const clearMemory = useClearMemory();
  const deleteMemoryFact = useDeleteMemoryFact();
  const [clearFlowOpen, setClearFlowOpen] = useState(false);
  const [clearSuccessBanner, setClearSuccessBanner] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemoryViewFilter>("all");
  const [activeSection, setActiveSection] = useState<MemoryMapSection>("user");
  const [activeLeaf, setActiveLeaf] = useState<MemoryMapLeaf>("personal");
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
  const selectedDetail = resolveSelectedMemoryDetail({
    activeSection,
    activeLeaf,
    memory,
    t,
  });

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
    section: "user" | "history",
    leaf:
      | "work"
      | "personal"
      | "topOfMind"
      | "recentMonths"
      | "earlierContext"
      | "longTermBackground",
  ) {
    setActiveSection(section);
    setActiveLeaf(leaf);
    setDetailOpen(true);
  }

  function handleSectionChange(section: MemoryMapSection, leaf: MemoryMapLeaf) {
    setActiveSection(section);
    setActiveLeaf(leaf);
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
        <header className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="border bg-background px-6 py-5">
              <div className="space-y-2">
                <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  Memory workspace
                </p>
                <h1 className="text-[2rem] font-semibold tracking-tight">
                  {t.workspaceSurfaces.memory.title}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  {t.workspaceSurfaces.memory.description}
                </p>
              </div>
            </div>
            <div className="border bg-foreground px-6 py-5 text-background">
              <div className="flex h-full items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.16em] text-background/70 uppercase">
                    Quick actions
                  </p>
                  <div className="mt-2 text-[1.75rem] font-semibold tracking-tight">
                    检索、核对、清理
                  </div>
                </div>
                <div className="text-right text-xs text-background/70">
                  <div>{t.settings.memory.summaryCards.lastUpdated}</div>
                  <div className="mt-2 text-base font-semibold text-background">
                    {lastUpdatedLabel ?? t.settings.memory.notAvailable}
                  </div>
                </div>
              </div>
            </div>

            {clearSuccessBanner ? (
              <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 xl:col-span-2">
                {t.settings.memory.clearAllSuccess}
              </div>
            ) : null}

            <div className="xl:col-span-2">
              <MemorySummaryCards memory={memory} />
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[190px_minmax(0,1fr)_340px]">
          <MemoryMapNav
            activeSection={activeSection}
            activeLeaf={activeLeaf}
            onSectionChange={handleSectionChange}
          />

          <div className="grid gap-4">
            <section className="border bg-background px-5 py-4">
              <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {t.workspaceSurfaces.memory.eyebrow}
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <h2 className="text-[1.85rem] font-semibold tracking-tight">
                  {t.settings.memory.quickSearchTitle}
                </h2>
                <div className="text-sm text-muted-foreground">
                  统一搜索、过滤、结构化召回和历史召回。
                </div>
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

          <MemoryDetailInspector
            kind={selectedDetail.kind}
            title={selectedDetail.title}
            summary={selectedDetail.summary}
            updatedAt={selectedDetail.updatedAt}
            memory={memory}
            facts={memory?.facts ?? []}
          />
        </div>
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

      <div className="xl:hidden">
        <MemoryDetailDrawer
          open={detailOpen}
          onOpenChange={setDetailOpen}
          kind={selectedDetail.kind}
          title={selectedDetail.title}
          summary={selectedDetail.summary}
          updatedAt={selectedDetail.updatedAt}
          memory={memory}
          facts={memory?.facts ?? []}
        />
      </div>
    </>
  );
}
