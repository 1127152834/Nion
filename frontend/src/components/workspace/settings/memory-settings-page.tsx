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
import { useAutoDreamRun } from "@/core/autodream";
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
import { MemoryProviderPanel } from "./memory-provider-panel";
import { MemoryConsolePanel } from "./memory-console-panel";
import { MemoryAgentCorePanel } from "./memory-agent-core-panel";
import {
  MemorySurfaceTabs,
  type MemorySurfaceKey,
} from "./memory-surface-tabs";

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
  const [surface, setSurface] = useState<MemorySurfaceKey>("provider");
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
  const runAutoDream = useAutoDreamRun();
  const [dreamQuery, setDreamQuery] = useState("");
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
        <MemorySurfaceTabs value={surface} onChange={setSurface} />

        {surface === "provider" ? (
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
        ) : null}

        {surface === "console" ? (
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
            overviewMarkdown={summariesToMarkdown(memory ?? {
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
            }, filteredSectionGroups, t)}
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
        ) : null}

        {surface === "agent-core" ? (
          <MemoryAgentCorePanel
            dreamQuery={dreamQuery}
            onDreamQueryChange={setDreamQuery}
            onRunAutoDream={() => {
              void runAutoDream.mutateAsync({
                query:
                  dreamQuery.trim() ||
                  submittedNotebookQuery ||
                  "recent project work",
              });
            }}
            runAutoDreamPending={runAutoDream.isPending}
            runAutoDreamData={runAutoDream.data ?? null}
            draftNotebookQuery={draftNotebookQuery}
            onDraftNotebookQueryChange={setDraftNotebookQuery}
            onNotebookSearch={() =>
              setSubmittedNotebookQuery(draftNotebookQuery.trim())
            }
            reindexPending={reindexNotebook.isPending}
            reindexData={reindexNotebook.data ?? null}
            notebookSearch={notebookSearch}
            notebookContextPreview={notebookContextPreview}
          />
        ) : null}

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
