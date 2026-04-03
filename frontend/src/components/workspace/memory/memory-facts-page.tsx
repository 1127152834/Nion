"use client";

import { useState } from "react";
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
import { pathOfMemory } from "@/core/navigation/desktop-routes";
import type {
  MemoryFact,
  MemoryFactInput,
  MemoryFactPatchInput,
} from "@/core/memory/types";
import { formatTimeAgo } from "@/core/utils/datetime";

import { MemoryBackLink } from "./memory-back-link";
import { MemoryClearFlow } from "./memory-clear-flow";

export function MemoryFactsPage() {
  const { t } = useI18n();
  const { memory } = useMemory();
  const clearMemory = useClearMemory();
  const createMemoryFact = useCreateMemoryFact();
  const updateMemoryFact = useUpdateMemoryFact();
  const deleteMemoryFact = useDeleteMemoryFact();
  const importMemory = useImportMemory();
  const [factDialogOpen, setFactDialogOpen] = useState(false);
  const [editingFact, setEditingFact] = useState<MemoryFact | null>(null);
  const [clearFlowOpen, setClearFlowOpen] = useState(false);
  const [factForm, setFactForm] = useState<MemoryFactInput>({
    content: "",
    category: "context",
    confidence: 0.8,
  });

  function handleCreateFact() {
    setEditingFact(null);
    setFactForm({ content: "", category: "context", confidence: 0.8 });
    setFactDialogOpen(true);
  }

  function handleEditFact(fact: MemoryFact) {
    setEditingFact(fact);
    setFactForm({
      content: fact.content,
      category: fact.category,
      confidence: fact.confidence,
    });
    setFactDialogOpen(true);
  }

  async function handleDeleteFact(fact: MemoryFact) {
    try {
      await deleteMemoryFact.mutateAsync(fact.id);
      toast.success(t.settings.memory.factDeleteSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSaveFact() {
    const trimmedContent = factForm.content.trim();
    if (!trimmedContent) {
      toast.error(t.settings.memory.factValidationContent);
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
        await createMemoryFact.mutateAsync({
          content: trimmedContent,
          category: factForm.category,
          confidence: factForm.confidence,
        });
        toast.success(t.settings.memory.addFactSuccess);
      }
      setFactDialogOpen(false);
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

  async function handleConfirmClearMemory() {
    try {
      await clearMemory.mutateAsync();
      toast.success(t.settings.memory.clearAllSuccess);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
        <header className="space-y-4 border bg-background px-6 py-5">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />
              <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Facts library
              </p>
              <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight">
                {t.settings.memory.markdown.facts}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => void handleImportMemory(event.nativeEvent)}
                />
                <Button variant="outline" asChild>
                  <span>{t.settings.memory.importAction}</span>
                </Button>
              </label>
              <Button variant="outline" onClick={() => void handleExportMemory()}>
                {t.settings.memory.exportAction}
              </Button>
              <Button variant="outline" onClick={() => setClearFlowOpen(true)}>
                {t.settings.memory.manageCleanup}
              </Button>
              <Button onClick={handleCreateFact}>{t.settings.memory.addFact}</Button>
            </div>
          </div>
        </header>

        <section className="space-y-3">
          {(memory?.facts ?? []).map((fact) => (
            <article
              key={fact.id}
              className="rounded-lg border bg-background p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-sm leading-7">{fact.content}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{fact.category}</span>
                    <span>{formatTimeAgo(fact.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditFact(fact)}>
                    {t.settings.memory.editFactTitle}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void handleDeleteFact(fact)}>
                    {t.common.delete}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

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

      <MemoryClearFlow
        open={clearFlowOpen}
        factsCount={memory?.facts.length ?? 0}
        lastUpdatedLabel={formatTimeAgo(memory?.lastUpdated)}
        affectedSections={[t.settings.memory.markdown.facts]}
        pending={clearMemory.isPending}
        onOpenChange={setClearFlowOpen}
        onConfirm={handleConfirmClearMemory}
      />
    </>
  );
}
