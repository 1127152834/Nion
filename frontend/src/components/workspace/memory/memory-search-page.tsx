"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/core/i18n/hooks";
import {
  useClearMemory,
  useCreateMemoryFact,
  useDeleteMemoryFact,
  useImportMemory,
  useMemory,
  useUpdateMemoryFact,
} from "@/core/memory/hooks";
import {
  searchStructuredMemory,
  type StructuredMemorySearchLabels,
} from "@/core/memory/search";
import { pathOfMemory } from "@/core/navigation/desktop-routes";
import type {
  MemoryFact,
  MemoryFactInput,
  MemoryFactPatchInput,
} from "@/core/memory/types";
import { useRecallSearch } from "@/core/recall/hooks";
import { formatTimeAgo } from "@/core/utils/datetime";

import { MemoryConsolePanel } from "../settings/memory-console-panel";
import { MemoryClearFlow } from "./memory-clear-flow";
import { MemoryDetailInspector } from "./memory-detail-inspector";

type MemoryViewFilter = "all" | "facts" | "summaries";

export function MemorySearchPage() {
  const { t } = useI18n();
  const { memory, isLoading, error } = useMemory();
  const clearMemory = useClearMemory();
  const createMemoryFact = useCreateMemoryFact();
  const deleteMemoryFact = useDeleteMemoryFact();
  const updateMemoryFact = useUpdateMemoryFact();
  const importMemory = useImportMemory();
  const [clearFlowOpen, setClearFlowOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemoryViewFilter>("all");
  const [selectedFact, setSelectedFact] = useState<MemoryFact | null>(null);
  const [factDialogOpen, setFactDialogOpen] = useState(false);
  const [editingFact, setEditingFact] = useState<MemoryFact | null>(null);
  const [factForm, setFactForm] = useState<MemoryFactInput>({
    content: "",
    category: "context",
    confidence: 0.8,
  });
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

  async function handleConfirmClearMemory() {
    try {
      await clearMemory.mutateAsync();
      toast.success(t.settings.memory.clearAllSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleExportMemory() {
    if (!memory) return;
    const blob = new Blob([JSON.stringify(memory, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nion-memory-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t.settings.memory.exportSuccess);
  }

  async function handleImportMemory(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importMemory.mutateAsync(JSON.parse(text));
      toast.success(t.settings.memory.importSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      if (input) input.value = "";
    }
  }

  function openCreateFactDialog() {
    setEditingFact(null);
    setFactForm({ content: "", category: "context", confidence: 0.8 });
    setFactDialogOpen(true);
  }

  function openEditFactDialog(fact: MemoryFact) {
    setEditingFact(fact);
    setSelectedFact(fact);
    setFactForm({
      content: fact.content,
      category: fact.category,
      confidence: fact.confidence,
    });
    setFactDialogOpen(true);
  }

  async function handleSaveFact() {
    const trimmedContent = factForm.content.trim();
    if (!trimmedContent) {
      toast.error(t.settings.memory.factValidationContent);
      return;
    }
    if (
      !Number.isFinite(factForm.confidence) ||
      factForm.confidence < 0 ||
      factForm.confidence > 1
    ) {
      toast.error(t.settings.memory.factValidationConfidence);
      return;
    }

    try {
      if (editingFact) {
        const input: MemoryFactPatchInput = {
          content: trimmedContent,
          category: factForm.category,
          confidence: factForm.confidence,
        };
        await updateMemoryFact.mutateAsync({ factId: editingFact.id, input });
        toast.success(t.settings.memory.editFactSuccess);
      } else {
        const input: MemoryFactInput = {
          content: trimmedContent,
          category: factForm.category,
          confidence: factForm.confidence,
        };
        await createMemoryFact.mutateAsync(input);
        toast.success(t.settings.memory.addFactSuccess);
      }
      setFactDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
        <header className="border bg-background px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Memory workspace
              </p>
              <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight">
                {t.settings.memory.quickSearchTitle}
              </h1>
            </div>
            <Link
              href={pathOfMemory()}
              className="rounded-md border bg-background px-3 py-2 text-sm font-medium"
            >
              返回记忆首页
            </Link>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="border bg-background px-5 py-4">
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
              filteredSectionGroups={[]}
              hasMatchingVisibleContent
              normalizedQuery={normalizedQuery}
              onQueryChange={setQuery}
              onFilterChange={setFilter}
              onOpenDangerZone={() => setClearFlowOpen(true)}
              onCreateFact={openCreateFactDialog}
              onEditFact={openEditFactDialog}
              onDeleteFact={(fact) => {
                setSelectedFact(fact);
                void deleteMemoryFact.mutateAsync(fact.id);
              }}
              onExportMemory={() => void handleExportMemory()}
              onImportMemory={(event) => void handleImportMemory(event)}
            />
          </section>

          <MemoryDetailInspector
            kind="facts"
            title={selectedFact?.content ? "事实详情" : t.settings.memory.markdown.facts}
            summary={selectedFact?.content ?? ""}
            updatedAt={selectedFact?.createdAt}
            memory={memory}
            facts={selectedFact ? [selectedFact] : memory?.facts ?? []}
          />
        </div>
      </main>

      <MemoryClearFlow
        open={clearFlowOpen}
        factsCount={memory?.facts.length ?? 0}
        lastUpdatedLabel={formatTimeAgo(memory?.lastUpdated)}
        affectedSections={[t.settings.memory.markdown.facts]}
        pending={clearMemory.isPending}
        onOpenChange={setClearFlowOpen}
        onConfirm={handleConfirmClearMemory}
      />

      <Dialog open={factDialogOpen} onOpenChange={setFactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFact
                ? t.settings.memory.editFactTitle
                : t.settings.memory.addFactTitle}
            </DialogTitle>
            <DialogDescription>
              {t.settings.memory.summaryReadOnly}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">
                {t.settings.memory.factContentLabel}
              </span>
              <textarea
                className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={factForm.content}
                placeholder={t.settings.memory.factContentPlaceholder}
                onChange={(event) =>
                  setFactForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t.settings.memory.factCategoryLabel}
                </span>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={factForm.category}
                  placeholder={t.settings.memory.factCategoryPlaceholder}
                  onChange={(event) =>
                    setFactForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t.settings.memory.factConfidenceLabel}
                </span>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={factForm.confidence}
                  onChange={(event) =>
                    setFactForm((current) => ({
                      ...current,
                      confidence: Number(event.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t.settings.memory.factConfidenceHint}
                </p>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFactDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={() => void handleSaveFact()}>
              {t.settings.memory.factSave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
