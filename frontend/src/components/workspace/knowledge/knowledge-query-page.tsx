"use client";

import { useState } from "react";

import { useI18n } from "@/core/i18n/hooks";
import { useKnowledgeQuery, useSaveKnowledgeSynthesis } from "@/core/knowledge";

function stateBadgeClassName(pageState: "active" | "stale" | "archived") {
  if (pageState === "active") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  }
  if (pageState === "stale") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  }
  return "border-slate-500/30 bg-slate-500/10 text-slate-700";
}

export function KnowledgeQueryPage() {
  const { t } = useI18n();
  const copy = t.knowledgePage.query;
  const knowledgeCopy = t.knowledgePage;
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);
  const { result, isLoading, error } = useKnowledgeQuery(submittedQuestion);
  const saveSynthesis = useSaveKnowledgeSynthesis();
  const canSubmit = question.trim().length > 0;

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <section className="rounded-lg border bg-background p-5">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
      </section>

      <section className="rounded-lg border bg-background p-5">
        <div className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="knowledge-question">{copy.label}</label>
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
              placeholder={copy.placeholder}
              className="min-h-10 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              disabled={!canSubmit}
              onClick={() => setSubmittedQuestion(question.trim())}
            >
              {copy.submit}
            </button>
          </div>
          <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {!submittedQuestion
              ? copy.empty
              : isLoading
              ? copy.loading
              : error
                ? copy.error
                : (result?.answer_markdown ?? copy.resultPlaceholder)}
          </div>
          {result ? (
            <div className="space-y-3 rounded-md border px-3 py-3 text-sm">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {knowledgeCopy.retrievalPolicyLabel(result.retrieval_policy)}
              </div>
              {result.warnings.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {copy.warnings}
                  </div>
                  <ul className="space-y-1 text-amber-700">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {copy.citations}
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.citations.map((citation) => (
                    <div
                      key={citation.page_id}
                      className="rounded-md border px-3 py-2 text-xs text-foreground"
                    >
                      <div className="font-medium">{citation.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 ${stateBadgeClassName(citation.page_state)}`}
                        >
                          {knowledgeCopy.pageStateLabel(citation.page_state)}
                        </span>
                        <span>{citation.page_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
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
            {copy.saveSynthesis}
          </button>
        </div>
      </section>
    </main>
  );
}
