"use client";

import { useState } from "react";

import { useKnowledgeQuery, useSaveKnowledgeSynthesis } from "@/core/knowledge";

export function KnowledgeQueryPage() {
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);
  const { result, isLoading, error } = useKnowledgeQuery(submittedQuestion);
  const saveSynthesis = useSaveKnowledgeSynthesis();
  const canSubmit = question.trim().length > 0;

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
          <label className="block text-sm font-medium" htmlFor="knowledge-question">
            query
          </label>
          <div className="flex gap-2">
            <input
              id="knowledge-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSubmit) {
                  setSubmittedQuestion(question.trim());
                }
              }}
              placeholder="Ask the knowledge base..."
              className="min-h-10 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              disabled={!canSubmit}
              onClick={() => setSubmittedQuestion(question.trim())}
            >
              query
            </button>
          </div>
          <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {!submittedQuestion
              ? "Enter a question to query compiled pages."
              : isLoading
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
                  question: submittedQuestion ?? question.trim(),
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
