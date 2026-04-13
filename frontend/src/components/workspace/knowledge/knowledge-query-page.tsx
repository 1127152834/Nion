"use client";

import { useState } from "react";

import { useKnowledgeQuery, useSaveKnowledgeSynthesis } from "@/core/knowledge";

export function KnowledgeQueryPage() {
  const [question] = useState("roadmap");
  const { result, isLoading, error } = useKnowledgeQuery(question);
  const saveSynthesis = useSaveKnowledgeSynthesis();

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <section className="rounded-lg border bg-background p-5">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Knowledge Query</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Query compiled pages and save useful answers as synthesis pages.
        </p>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="space-y-3">
          <div className="text-sm font-medium">query</div>
          <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {isLoading
              ? "loading query…"
              : error
                ? "query error"
                : (result?.answer_markdown ?? "page-based query result area")}
          </div>
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => {
              if (result?.answer_markdown) {
                saveSynthesis.mutate({
                  question: "What does the roadmap say?",
                  answer_markdown: result.answer_markdown,
                });
              }
            }}
          >
            保存为 synthesis
          </button>
        </div>
      </section>
    </main>
  );
}
