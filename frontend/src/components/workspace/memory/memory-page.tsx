"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRunMemoryCompaction } from "@/core/compaction/hooks";
import { useClearCompactionLogs } from "@/core/compaction/hooks";
import { useCompactionLogs } from "@/core/compaction/hooks";
import { useMemoryUsage } from "@/core/compaction/hooks";
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
import {
  useClearRebuildLogs,
  useRebuildLogs,
  useRunMemoryRebuild,
} from "@/core/rebuild/hooks";
import { formatTimeAgo } from "@/core/utils/datetime";

import { ConfigValidationErrors } from "../settings/config-validation-errors";
import { ConfigSaveBar } from "../settings/configuration/config-save-bar";
import { asObject, asString, cloneConfig } from "../settings/configuration/shared";
import { MemoryConsolePanel } from "../settings/memory-console-panel";
import { MemoryProviderPanel } from "../settings/memory-provider-panel";
import {
  FILE_MEMORY_STORAGE_CLASS,
  inferMemoryStorageMode,
  resolveMemoryStorageModeSelection,
  type MemoryStorageMode,
} from "../settings/memory-settings-page.storage";
import { useConfigEditor } from "../settings/use-config-editor";

type MemoryViewFilter = "all" | "facts" | "summaries";
type MemoryFact = UserMemory["facts"][number];

type MemorySection = {
  title: string;
  summary: string;
  updatedAt?: string;
};

type MemorySectionGroup = {
  title: string;
  sections: MemorySection[];
};

function formatMemorySection(
  section: MemorySection,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const updatedAtLabel = formatTimeAgo(section.updatedAt);
  const content =
    section.summary.trim() ||
    `<span class="text-muted-foreground">${t.settings.memory.markdown.empty}</span>`;
  return [
    `### ${section.title}`,
    content,
    "",
    updatedAtLabel &&
      `> ${t.settings.memory.markdown.updatedAt}: \`${updatedAtLabel}\``,
  ]
    .filter(Boolean)
    .join("\n");
}

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

function summariesToMarkdown(
  memory: UserMemory,
  sectionGroups: MemorySectionGroup[],
  t: ReturnType<typeof useI18n>["t"],
) {
  const parts: string[] = [];
  const lastUpdatedLabel = formatTimeAgo(memory.lastUpdated);

  parts.push(`## ${t.settings.memory.markdown.overview}`);
  if (lastUpdatedLabel) {
    parts.push(`- **${t.common.lastUpdated}**: \`${lastUpdatedLabel}\``);
  }

  for (const group of sectionGroups) {
    parts.push(`\n## ${group.title}`);
    for (const section of group.sections) {
      parts.push(formatMemorySection(section, t));
    }
  }

  const markdown = parts.join("\n\n");
  const lines = markdown.split("\n");
  const out: string[] = [];
  let index = 0;
  for (const line of lines) {
    index++;
    if (index !== 1 && line.startsWith("## ")) {
      if (out.length === 0 || out[out.length - 1] !== "---") {
        out.push("---");
      }
    }
    out.push(line);
  }

  return out.join("\n");
}

function truncateFactPreview(content: string, maxLength = 140) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  const ellipsis = "...";
  if (maxLength <= ellipsis.length) {
    return normalized.slice(0, maxLength);
  }
  return `${normalized.slice(0, maxLength - ellipsis.length)}${ellipsis}`;
}

function emptyMemory(): UserMemory {
  return {
    version: "1.0",
    lastUpdated: "",
    user: {
      workContext: { summary: "", updatedAt: "" },
      personalContext: { summary: "", updatedAt: "" },
      topOfMind: { summary: "", updatedAt: "" },
    },
    history: {
      recentMonths: { summary: "", updatedAt: "" },
      earlierContext: { summary: "", updatedAt: "" },
      longTermBackground: { summary: "", updatedAt: "" },
    },
    facts: [],
  };
}

export function MemoryPage() {
  const { t } = useI18n();
  const { memory, isLoading, error } = useMemory();
  const clearMemory = useClearMemory();
  const deleteMemoryFact = useDeleteMemoryFact();
  const {
    configData,
    draftConfig,
    validationErrors,
    validationWarnings,
    dirty,
    disabled,
    saving,
    onConfigChange,
    onDiscard,
    onSave,
  } = useConfigEditor();
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemoryViewFilter>("all");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [factToDelete, setFactToDelete] = useState<MemoryFact | null>(null);
  const [storageModeOverride, setStorageModeOverride] =
    useState<MemoryStorageMode | null>(null);
  const [customStorageDraft, setCustomStorageDraft] = useState("");
  const [compactionRatio, setCompactionRatio] = useState("0.35");
  const [compactionDecayDays, setCompactionDecayDays] = useState("0");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const recall = useRecallSearch(submittedQuery, 5);
  const runMemoryCompaction = useRunMemoryCompaction();
  const compactionLogs = useCompactionLogs();
  const clearCompactionLogs = useClearCompactionLogs();
  const memoryUsage = useMemoryUsage();
  const runMemoryRebuild = useRunMemoryRebuild();
  const rebuildLogs = useRebuildLogs();
  const clearRebuildLogs = useClearRebuildLogs();
  const memoryConfigDraft = asObject(draftConfig.memory);
  const storageClass =
    asString(memoryConfigDraft.storage_class).trim() ||
    FILE_MEMORY_STORAGE_CLASS;
  const storageMode = storageModeOverride ?? inferMemoryStorageMode(storageClass);
  const customStorageClass =
    storageMode === "custom"
      ? customStorageDraft ||
        (inferMemoryStorageMode(storageClass) === "custom" ? storageClass : "")
      : "";
  const persistedStorageClass =
    asString(asObject(asObject(configData?.config).memory).storage_class).trim() ||
    FILE_MEMORY_STORAGE_CLASS;
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
  const latestCompactionLog = compactionLogs.data?.items[0] ?? null;
  const latestRebuildLog = rebuildLogs.data?.items[0] ?? null;
  const showSummaries = filter !== "facts";
  const showFacts = filter !== "summaries";
  const hasMatchingVisibleContent =
    !memory ||
    (showSummaries && filteredSectionGroups.length > 0) ||
    (showFacts && filteredFacts.length > 0);

  function onMemoryConfigChange(nextStorageClass: string) {
    const nextConfig = cloneConfig(draftConfig);
    const nextMemory = asObject(nextConfig.memory);
    nextMemory.storage_class = nextStorageClass;
    nextConfig.memory = nextMemory;
    onConfigChange(nextConfig);
  }

  function resetStorageEditorState(nextStorageClass: string) {
    setStorageModeOverride(null);
    setCustomStorageDraft(
      inferMemoryStorageMode(nextStorageClass) === "custom"
        ? nextStorageClass
        : "",
    );
  }

  async function handleClearMemory() {
    try {
      await clearMemory.mutateAsync();
      toast.success(t.settings.memory.clearAllSuccess);
      setClearDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDeleteFact() {
    if (!factToDelete) {
      return;
    }

    try {
      await deleteMemoryFact.mutateAsync(factToDelete.id);
      toast.success(t.settings.memory.factDeleteSuccess);
      setFactToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRunCompaction() {
    const nextRatio = Number.parseFloat(compactionRatio);
    const nextDecayDays = Number.parseInt(compactionDecayDays, 10);

    try {
      const result = await runMemoryCompaction.mutateAsync({
        ratio: Number.isFinite(nextRatio) && nextRatio > 0 ? nextRatio : 0.35,
        decay_days:
          Number.isFinite(nextDecayDays) && nextDecayDays >= 0 ? nextDecayDays : 0,
      });
      toast.success(result.summary);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleClearCompactionLogHistory() {
    try {
      await clearCompactionLogs.mutateAsync();
      toast.success(t.settings.compaction.clearLogs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRunRebuild() {
    try {
      const result = await runMemoryRebuild.mutateAsync();
      toast.success(result.summary);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleClearRebuildLogHistory() {
    try {
      await clearRebuildLogs.mutateAsync();
      toast.success(t.settings.rebuild.clearLogs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t.workspaceSurfaces.memory.eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.workspaceSurfaces.memory.title}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t.workspaceSurfaces.memory.description}
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">
                  {t.settings.memory.surfaces.provider.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t.settings.memory.surfaces.provider.description}
                </p>
              </div>

              <MemoryProviderPanel
                disabled={disabled}
                storageMode={storageMode}
                customStorageClass={customStorageClass}
                customClassPlaceholder={t.settings.memory.storage.customClassPlaceholder}
                onStorageModeChange={(value) => {
                  const next = resolveMemoryStorageModeSelection(
                    value,
                    storageClass,
                    customStorageDraft,
                  );
                  setStorageModeOverride(next.nextModeOverride);
                  setCustomStorageDraft(next.nextCustomDraft);
                  if (next.nextStoredClass !== storageClass) {
                    onMemoryConfigChange(next.nextStoredClass);
                  }
                }}
                onCustomStorageClassChange={(value) => {
                  setStorageModeOverride("custom");
                  setCustomStorageDraft(value);
                  onMemoryConfigChange(value.trim() || FILE_MEMORY_STORAGE_CLASS);
                }}
              />

              <ConfigValidationErrors
                errors={validationErrors}
                warnings={validationWarnings}
              />
              <ConfigSaveBar
                dirty={dirty}
                disabled={disabled}
                saving={saving}
                onDiscard={() => {
                  resetStorageEditorState(persistedStorageClass);
                  onDiscard();
                }}
                onSave={() => {
                  void onSave().then((saved) => {
                    if (saved) {
                      resetStorageEditorState(storageClass);
                    }
                  });
                }}
              />
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">
                  {t.workspaceSurfaces.memory.consoleTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t.workspaceSurfaces.memory.consoleDescription}
                </p>
              </div>

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
                overviewMarkdown={summariesToMarkdown(
                  memory ?? emptyMemory(),
                  filteredSectionGroups,
                  t,
                )}
                query={query}
                filter={filter}
                filteredFacts={filteredFacts}
                filteredSectionGroups={filteredSectionGroups}
                hasMatchingVisibleContent={hasMatchingVisibleContent}
                normalizedQuery={normalizedQuery}
                onQueryChange={setQuery}
                onFilterChange={setFilter}
                onClearAll={() => setClearDialogOpen(true)}
                onDeleteFact={setFactToDelete}
                clearPending={clearMemory.isPending}
              />
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border bg-background/80 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-medium">
                    {t.settings.compaction.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t.settings.memory.summaryReadOnly}
                  </p>
                </div>
                <Badge variant="secondary">
                  {memoryUsage.data?.count ?? 0}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <div className="text-xs font-medium">
                    Ratio
                  </div>
                  <Input
                    value={compactionRatio}
                    onChange={(event) => setCompactionRatio(event.target.value)}
                    inputMode="decimal"
                  />
                </label>
                <label className="space-y-1.5">
                  <div className="text-xs font-medium">
                    Decay days
                  </div>
                  <Input
                    value={compactionDecayDays}
                    onChange={(event) => setCompactionDecayDays(event.target.value)}
                    inputMode="numeric"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <div>
                  {t.settings.compaction.usage}: {memoryUsage.data?.count ?? 0}
                </div>
                <div>
                  Provider: {memoryUsage.data?.provider ?? FILE_MEMORY_STORAGE_CLASS}
                </div>
                <div>
                  Bytes: {memoryUsage.data?.estimated_storage_bytes ?? 0}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => void handleRunCompaction()}
                  disabled={runMemoryCompaction.isPending}
                >
                  {runMemoryCompaction.isPending
                    ? t.common.loading
                    : t.settings.compaction.compactNow}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleClearCompactionLogHistory()}
                  disabled={clearCompactionLogs.isPending}
                >
                  {clearCompactionLogs.isPending
                    ? t.common.loading
                    : t.settings.compaction.clearLogs}
                </Button>
              </div>

              <div className="mt-4 rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">
                    {t.settings.compaction.logs}
                  </div>
                  <Badge variant="outline">
                    {compactionLogs.data?.total_count ?? 0}
                  </Badge>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {latestCompactionLog ? latestCompactionLog.summary : t.settings.memory.empty}
                </div>
                {latestCompactionLog?.completed_at ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatTimeAgo(latestCompactionLog.completed_at)}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border bg-background/80 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-medium">
                    {t.settings.rebuild.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t.settings.rebuild.restore}
                  </p>
                </div>
                <Badge variant="secondary">
                  {rebuildLogs.data?.total_count ?? 0}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => void handleRunRebuild()}
                  disabled={runMemoryRebuild.isPending}
                >
                  {runMemoryRebuild.isPending
                    ? t.common.loading
                    : t.settings.rebuild.rebuildNow}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleClearRebuildLogHistory()}
                  disabled={clearRebuildLogs.isPending}
                >
                  {clearRebuildLogs.isPending
                    ? t.common.loading
                    : t.settings.rebuild.clearLogs}
                </Button>
              </div>

              <div className="mt-4 rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">
                    {t.settings.rebuild.logs}
                  </div>
                  <Badge variant="outline">
                    {rebuildLogs.data?.total_count ?? 0}
                  </Badge>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {latestRebuildLog ? latestRebuildLog.summary : t.settings.memory.empty}
                </div>
                {latestRebuildLog ? (
                  <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                    <div>Restored: {latestRebuildLog.restored_count}</div>
                    <div>Skipped: {latestRebuildLog.skipped_count}</div>
                    <div>Sources: {latestRebuildLog.source_count}</div>
                  </div>
                ) : null}
                {latestRebuildLog?.completed_at ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatTimeAgo(latestRebuildLog.completed_at)}
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.memory.clearAllConfirmTitle}</DialogTitle>
            <DialogDescription>
              {t.settings.memory.clearAllConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearDialogOpen(false)}
              disabled={clearMemory.isPending}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleClearMemory()}
              disabled={clearMemory.isPending}
            >
              {clearMemory.isPending ? t.common.loading : t.settings.memory.clearAll}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={factToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFactToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.memory.factDeleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {t.settings.memory.factDeleteConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          {factToDelete ? (
            <div className="rounded-md border bg-muted p-3 text-sm">
              <div className="mb-1 font-medium text-muted-foreground">
                {t.settings.memory.factPreviewLabel}
              </div>
              <p className="break-words">
                {truncateFactPreview(factToDelete.content)}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFactToDelete(null)}
              disabled={deleteMemoryFact.isPending}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteFact()}
              disabled={deleteMemoryFact.isPending}
            >
              {deleteMemoryFact.isPending ? t.common.loading : t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
