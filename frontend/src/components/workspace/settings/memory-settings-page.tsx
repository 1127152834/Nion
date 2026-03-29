"use client";

import { Trash2Icon } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import {
  useNotebookContextPreview,
  useNotebookResourceSearch,
  useReindexNotebookResources,
} from "@/core/openviking";
import { useRecallSearch } from "@/core/recall/hooks";
import { streamdownPlugins } from "@/core/streamdown/plugins";
import { pathOfThread } from "@/core/threads/utils";
import { formatTimeAgo } from "@/core/utils/datetime";

import { ConfigValidationErrors } from "./config-validation-errors";
import { ConfigSaveBar } from "./configuration/config-save-bar";
import { asObject, asString, cloneConfig } from "./configuration/shared";
import {
  FILE_MEMORY_STORAGE_CLASS,
  inferMemoryStorageMode,
  resolveMemoryStorageModeSelection,
  type MemoryStorageMode,
} from "./memory-settings-page.storage";
import { SettingsSection } from "./settings-section";
import { useConfigEditor } from "./use-config-editor";

const OPENVIKING_FALLBACK_COPY = {
  title: "Reindex notebook",
  titleZh: "重新索引笔记",
  search: "Search notebook resources",
  searchZh: "搜索笔记资源",
  preview: "Preview context",
  previewZh: "预览上下文",
};

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

function confidenceToLevelKey(confidence: unknown): {
  key: "veryHigh" | "high" | "normal" | "unknown";
  value?: number;
} {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    return { key: "unknown" };
  }

  // Clamp to [0, 1] since confidence is expected to be a probability-like score.
  const value = Math.min(1, Math.max(0, confidence));

  // 3 levels:
  // - veryHigh: [0.85, 1]
  // - high:     [0.65, 0.85)
  // - normal:   [0, 0.65)
  if (value >= 0.85) return { key: "veryHigh", value };
  if (value >= 0.65) return { key: "high", value };
  return { key: "normal", value };
}

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

  // Ensure every level-2 heading (##) is preceded by a horizontal rule.
  const lines = markdown.split("\n");
  const out: string[] = [];
  let i = 0;
  for (const line of lines) {
    i++;
    if (i !== 1 && line.startsWith("## ")) {
      if (out.length === 0 || out[out.length - 1] !== "---") {
        out.push("---");
      }
    }
    out.push(line);
  }

  return out.join("\n");
}

function isMemorySummaryEmpty(memory: UserMemory) {
  return (
    memory.user.workContext.summary.trim() === "" &&
    memory.user.personalContext.summary.trim() === "" &&
    memory.user.topOfMind.summary.trim() === "" &&
    memory.history.recentMonths.summary.trim() === "" &&
    memory.history.earlierContext.summary.trim() === "" &&
    memory.history.longTermBackground.summary.trim() === ""
  );
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

export function MemorySettingsPage() {
  const { t } = useI18n();
  const { memory, isLoading, error } = useMemory();
  const clearMemory = useClearMemory();
  const deleteMemoryFact = useDeleteMemoryFact();
  const {
    configData,
    draftConfig,
    validationErrors,
    validationWarnings,
    isLoading: isConfigLoading,
    error: configError,
    dirty,
    disabled,
    saving,
    onConfigChange,
    onDiscard,
    onSave,
  } = useConfigEditor();
  const [draftQuery, setDraftQuery] = useState("");
  const [draftNotebookQuery, setDraftNotebookQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [submittedNotebookQuery, setSubmittedNotebookQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemoryViewFilter>("all");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [factToDelete, setFactToDelete] = useState<MemoryFact | null>(null);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const recall = useRecallSearch(submittedQuery, 5);
  const notebookSearch = useNotebookResourceSearch(submittedNotebookQuery, 5);
  const notebookContextPreview = useNotebookContextPreview(
    submittedNotebookQuery,
    5,
  );
  const reindexNotebook = useReindexNotebookResources();
  const [storageModeOverride, setStorageModeOverride] =
    useState<MemoryStorageMode | null>(null);
  const [customStorageDraft, setCustomStorageDraft] = useState("");
  const memoryConfigDraft = asObject(draftConfig.memory);
  const storageClass =
    asString(memoryConfigDraft.storage_class).trim() ||
    FILE_MEMORY_STORAGE_CLASS;
  const storageMode = storageModeOverride ?? inferMemoryStorageMode(storageClass);
  const customStorageClass =
    storageMode === "custom"
      ? customStorageDraft || (inferMemoryStorageMode(storageClass) === "custom"
          ? storageClass
          : FILE_MEMORY_STORAGE_CLASS)
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
    [memory, submittedQuery, searchLabels],
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(draftQuery.trim());
  }

  function handleNotebookSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedNotebookQuery(draftNotebookQuery.trim());
  }

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
    if (!factToDelete) return;

    try {
      await deleteMemoryFact.mutateAsync(factToDelete.id);
      toast.success(t.settings.memory.factDeleteSuccess);
      setFactToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <SettingsSection
        title={t.settings.memory.title}
        description={t.settings.memory.description}
      >
      <div className="rounded-xl border bg-background/80 p-5 shadow-sm">
        {isConfigLoading ? (
          <div className="text-muted-foreground text-sm">{t.common.loading}</div>
        ) : configError ? (
          <div className="text-destructive text-sm">
            {configError instanceof Error
              ? configError.message
              : t.settings.memory.storage.description}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-medium">
                {t.settings.memory.storage.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t.settings.memory.storage.description}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <label className="space-y-1.5">
                <div className="text-xs font-medium">
                  {t.settings.memory.storage.modeLabel}
                </div>
                <Select
                  value={storageMode}
                  onValueChange={(value) => {
                    const next = resolveMemoryStorageModeSelection(
                      value as MemoryStorageMode,
                      storageClass,
                      customStorageDraft,
                    );
                    setStorageModeOverride(next.nextModeOverride);
                    setCustomStorageDraft(next.nextCustomDraft);
                    if (next.nextStoredClass !== storageClass) {
                      onMemoryConfigChange(next.nextStoredClass);
                    }
                  }}
                >
                  <SelectTrigger disabled={disabled}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file">
                      {t.settings.memory.storage.fileMode}
                    </SelectItem>
                    <SelectItem value="custom">
                      {t.settings.memory.storage.customMode}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </label>

              {storageMode === "custom" ? (
                <label className="space-y-1.5">
                  <div className="text-xs font-medium">
                    {t.settings.memory.storage.customClassLabel}
                  </div>
                  <Input
                    value={customStorageClass}
                    disabled={disabled}
                    placeholder={t.settings.memory.storage.customClassPlaceholder}
                    onChange={(event) => {
                      setStorageModeOverride("custom");
                      setCustomStorageDraft(event.target.value);
                      onMemoryConfigChange(
                        event.target.value.trim() || FILE_MEMORY_STORAGE_CLASS,
                      )
                    }}
                  />
                </label>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-muted/20 p-5 sm:p-6">
        <div className="space-y-1">
          <h3 className="text-base font-medium">
            {t.settings.memory.recall.title}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t.settings.memory.recall.description}
          </p>
        </div>
        <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
          <Input
            placeholder={t.settings.memory.recall.placeholder}
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
          <Button type="submit">{t.settings.memory.recall.searchButton}</Button>
        </form>
        <div className="mt-5 space-y-5">
          {!submittedQuery ? (
            <div className="text-muted-foreground text-sm">
              {t.settings.memory.recall.idle}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">
                    {t.settings.memory.recall.structuredTitle}
                  </h4>
                  <Badge variant="secondary">{structuredResults.length}</Badge>
                </div>
                {structuredResults.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    {t.settings.memory.recall.structuredEmpty}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {structuredResults.map((result) => {
                      const updatedAtLabel = formatTimeAgo(result.updatedAt);

                      return (
                        <div
                          key={result.id}
                          className="rounded-md border bg-background p-3"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{result.title}</Badge>
                            {updatedAtLabel ? (
                              <span className="text-muted-foreground text-xs">
                                {updatedAtLabel}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm leading-6">{result.snippet}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">
                    {t.settings.memory.recall.historyTitle}
                  </h4>
                  {!recall.isLoading && !recall.isFetching && !recall.error ? (
                    <Badge variant="secondary">{recall.results.length}</Badge>
                  ) : null}
                </div>
                {recall.isLoading || recall.isFetching ? (
                  <div className="text-muted-foreground text-sm">
                    {t.common.loading}
                  </div>
                ) : recall.error ? (
                  <div className="text-destructive text-sm">
                    {t.settings.memory.recall.loadFailed}
                  </div>
                ) : recall.results.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    {t.settings.memory.recall.historyEmpty}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recall.results.map((result, index) => {
                      const createdAtLabel = formatTimeAgo(result.created_at);

                      return (
                        <div
                          key={`${result.thread_id}-${result.agent_name}-${index}`}
                          className="rounded-md border bg-background p-3"
                        >
                          <div className="text-muted-foreground mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            <span>
                              {t.settings.memory.recall.threadLabel}: {result.thread_id}
                            </span>
                            <span>
                              {t.settings.memory.recall.agentLabel}: {result.agent_name}
                            </span>
                            {createdAtLabel ? <span>{createdAtLabel}</span> : null}
                          </div>
                          <p className="text-sm leading-6">{result.snippet}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-5 sm:p-6">
        <div className="space-y-1">
          <h3 className="text-base font-medium">
            {t.settings.memory.openviking.title || OPENVIKING_FALLBACK_COPY.title}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t.settings.memory.openviking.description}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void reindexNotebook.mutateAsync()}
            disabled={reindexNotebook.isPending}
          >
            {reindexNotebook.isPending
              ? t.settings.memory.openviking.reindexingButton
              : t.settings.memory.openviking.reindexButton || OPENVIKING_FALLBACK_COPY.titleZh}
          </Button>
          {reindexNotebook.data ? (
            <span className="text-muted-foreground text-sm">
              {t.settings.memory.openviking.reindexResult.replace(
                "{count}",
                String(reindexNotebook.data.notes_indexed),
              )}
            </span>
          ) : null}
        </div>

        <form className="mt-4 flex gap-2" onSubmit={handleNotebookSubmit}>
          <Input
            placeholder={
              t.settings.memory.openviking.searchPlaceholder ||
              OPENVIKING_FALLBACK_COPY.search
            }
            value={draftNotebookQuery}
            onChange={(event) => setDraftNotebookQuery(event.target.value)}
          />
          <Button type="submit">
            {t.settings.memory.openviking.searchButton || OPENVIKING_FALLBACK_COPY.searchZh}
          </Button>
        </form>

        <div className="mt-5 space-y-3">
          {!submittedNotebookQuery ? (
            <div className="text-muted-foreground text-sm">
              {t.settings.memory.openviking.idle}
            </div>
          ) : notebookSearch.isLoading || notebookSearch.isFetching ? (
            <div className="text-muted-foreground text-sm">{t.common.loading}</div>
          ) : notebookSearch.error ? (
            <div className="text-destructive text-sm">
              {t.settings.memory.openviking.loadFailed}
            </div>
          ) : (notebookSearch.data?.items.length ?? 0) === 0 ? (
            <div className="text-muted-foreground text-sm">
              {t.settings.memory.openviking.empty}
            </div>
          ) : (
            <div className="space-y-3">
              {notebookSearch.data?.items.map((item) => (
                <div
                  key={`${item.resource_uri}-${item.char_start}`}
                  className="rounded-md border bg-background p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.title}</Badge>
                    <span className="text-muted-foreground text-xs">
                      {item.source_relative_path}
                    </span>
                  </div>
                  <p className="mb-2 text-sm leading-6">{item.snippet}</p>
                  <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span>
                      {t.settings.memory.openviking.headingLabel}:{" "}
                      {item.heading_path.length > 0
                        ? item.heading_path.join(" / ")
                        : "-"}
                    </span>
                    <span>
                      {t.settings.memory.openviking.rangeLabel}: {item.char_start}-
                      {item.char_end}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {submittedNotebookQuery ? (
          <div className="mt-5 space-y-2">
            <h4 className="text-sm font-medium">
              {t.settings.memory.openviking.previewTitle ||
                OPENVIKING_FALLBACK_COPY.previewZh}
            </h4>
            {notebookContextPreview.isLoading ||
            notebookContextPreview.isFetching ? (
              <div className="text-muted-foreground text-sm">
                {t.common.loading}
              </div>
            ) : notebookContextPreview.error ? (
              <div className="text-destructive text-sm">
                {t.settings.memory.openviking.loadFailed}
              </div>
            ) : notebookContextPreview.data ? (
              <pre className="overflow-x-auto rounded-md border bg-background p-3 text-xs leading-6 whitespace-pre-wrap">
                {notebookContextPreview.data.markdown}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-2">
        <h3 className="text-base font-medium">
          {t.settings.memory.recall.overviewTitle}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t.settings.memory.recall.overviewDescription}
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.settings.memory.searchPlaceholder}
            className="sm:max-w-xs"
          />
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(value) => {
              if (value) setFilter(value as MemoryViewFilter);
            }}
            variant="outline"
          >
            <ToggleGroupItem value="all">
              {t.settings.memory.filterAll}
            </ToggleGroupItem>
            <ToggleGroupItem value="facts">
              {t.settings.memory.filterFacts}
            </ToggleGroupItem>
            <ToggleGroupItem value="summaries">
              {t.settings.memory.filterSummaries}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Button
          variant="destructive"
          onClick={() => setClearDialogOpen(true)}
          disabled={clearMemory.isPending || !memory}
        >
          {clearMemory.isPending ? t.common.loading : t.settings.memory.clearAll}
        </Button>
      </div>
      <div className="mt-3 text-muted-foreground text-sm">
        {t.settings.memory.summaryReadOnly}
      </div>
      <div className="mt-4 rounded-lg border p-4">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">{t.common.loading}</div>
        ) : error ? (
          <div className="text-destructive text-sm">{error.message}</div>
        ) : !memory ? (
          <div className="text-muted-foreground text-sm">
            {t.settings.memory.empty}
          </div>
        ) : isMemorySummaryEmpty(memory) && memory.facts.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            {t.settings.memory.memoryFullyEmpty}
          </div>
        ) : !hasMatchingVisibleContent && normalizedQuery ? (
          <div className="text-muted-foreground text-sm">
            {t.settings.memory.noMatches}
          </div>
        ) : (
          <div className="space-y-4">
            {showSummaries && filteredSectionGroups.length > 0 ? (
              <Streamdown
                className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                {...streamdownPlugins}
              >
                {summariesToMarkdown(memory, filteredSectionGroups, t)}
              </Streamdown>
            ) : null}

            {showFacts ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">
                    {t.settings.memory.markdown.facts}
                  </h4>
                  <Badge variant="secondary">{filteredFacts.length}</Badge>
                </div>
                {filteredFacts.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    {normalizedQuery
                      ? t.settings.memory.noMatches
                      : t.settings.memory.noFacts}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredFacts.map((fact) => {
                      const { key } = confidenceToLevelKey(fact.confidence);
                      const confidenceText =
                        t.settings.memory.markdown.table.confidenceLevel[key];
                      const createdAtLabel = formatTimeAgo(fact.createdAt) || "-";

                      return (
                        <div
                          key={fact.id}
                          className="flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                              <span>
                                <span className="text-muted-foreground">
                                  {t.settings.memory.markdown.table.category}:
                                </span>{" "}
                                {upperFirst(fact.category)}
                              </span>
                              <span>
                                <span className="text-muted-foreground">
                                  {t.settings.memory.markdown.table.confidence}:
                                </span>{" "}
                                {confidenceText}
                              </span>
                              <span>
                                <span className="text-muted-foreground">
                                  {t.settings.memory.markdown.table.createdAt}:
                                </span>{" "}
                                {createdAtLabel}
                              </span>
                            </div>
                            <p className="break-words text-sm leading-6">
                              {fact.content}
                            </p>
                            <Link
                              href={pathOfThread(fact.source)}
                              className="text-primary text-sm underline-offset-4 hover:underline"
                            >
                              {t.settings.memory.markdown.table.view}
                            </Link>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive shrink-0"
                            onClick={() => setFactToDelete(fact)}
                            disabled={deleteMemoryFact.isPending}
                            title={t.common.delete}
                            aria-label={t.common.delete}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

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
      </SettingsSection>

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
            <div className="bg-muted rounded-md border p-3 text-sm">
              <div className="text-muted-foreground mb-1 font-medium">
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

function upperFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
