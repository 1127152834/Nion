import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge home page centers overview queue and graph status instead of notebook editing", async () => {
  const source = await readFile(
    new URL("./knowledge-home-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useI18n/);
  assert.match(source, /t\.knowledgePage/);
  assert.match(source, /copy\.homeTitle/);
  assert.match(source, /copy\.homeDescription/);
  assert.match(source, /queue/i);
  assert.match(source, /graph/i);
  assert.match(source, /activity/i);
  assert.match(source, /copy\.activityEventLabel/);
  assert.match(source, /reconcile|对账/);
  assert.match(source, /useReconcileKnowledgeSources/);
  assert.match(source, /onClick=\{\(\)\s*=>\s*reconcile\.mutate\(\)\}/);
  assert.match(source, /reconcile\.isPending/);
  assert.match(source, /disabled=\{reconcile\.isPending\}/);
  assert.match(source, /reconcile\.isPending\s*\?\s*copy\.reconciling/);
  assert.match(source, /activeJob/);
  assert.match(source, /copy\.jobSummary/);
  assert.match(source, /copy\.queueCandidateSummary/);
  assert.match(source, /copy\.jobHistorySummary/);
  assert.match(source, /copy\.activityEventSummary/);
  assert.match(source, /copy\.orphanPages/);
  assert.doesNotMatch(source, /Textarea|draftBody|onDraftBodyChange/);
});

void test("knowledge home page can point users to retrieval models when semantic retrieval is unavailable", async () => {
  const source = await readFile(
    new URL("./knowledge-home-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /copy\.semanticRetrievalTitle/);
  assert.match(source, /copy\.semanticRetrievalDescription/);
});
