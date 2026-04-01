import assert from "node:assert/strict";
import test from "node:test";

import {
  createProjectDraftFromNotebook,
  createProjectPlanDraftFromNotebook,
  createProjectConstraintCandidatesFromNotebook,
  createMemoryCandidatesFromNotebook,
  createNotebookDraftFromProject,
  createMemoryCandidatesFromProject,
  createSkillCandidatesFromProject,
  attachNotebookNoteToProject,
} from "./api.ts";

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("object bridge notebook APIs hit expected endpoints", async () => {
  const requests: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push(`${init?.method ?? "GET"} ${url}`);

    return createJsonResponse({
      candidate: {
        id: "cand-1",
        type: "project_draft",
        title: "Candidate",
        summary: "summary",
        payload: {},
        requires_confirmation: true,
        provenance: [],
        created_at: "2026-04-01T00:00:00Z",
      },
    });
  };

  try {
    await createProjectDraftFromNotebook({
      note_ids: ["note_1"],
      fragment_ids: [],
      mode: "project_draft",
    });
    await createProjectPlanDraftFromNotebook({
      project_id: "proj_1",
      note_ids: ["note_1"],
      fragment_ids: [],
    });
    await createProjectConstraintCandidatesFromNotebook({
      project_id: "proj_1",
      note_ids: ["note_1"],
      fragment_ids: [],
    });
    await createMemoryCandidatesFromNotebook({
      note_ids: ["note_1"],
      fragment_ids: [],
    });
    await createNotebookDraftFromProject("proj_1", {
      kind: "summary",
      scope: "whole_project",
      target_directory: "收件箱",
    });
    await createMemoryCandidatesFromProject("proj_1", {
      kind: "long_term_memory",
      scope: "whole_project",
    });
    await createSkillCandidatesFromProject("proj_1", {
      scope: "whole_project",
    });
    await attachNotebookNoteToProject("proj_1", {
      note_id: "note_1",
      fragment_id: null,
      relation: "reference",
    });

    assert.deepEqual(requests, [
      "POST /api/notebook/bridge/project-drafts",
      "POST /api/notebook/bridge/project-plan-drafts",
      "POST /api/notebook/bridge/project-constraint-candidates",
      "POST /api/notebook/bridge/memory-candidates",
      "POST /api/projects/proj_1/bridge/notebook-drafts",
      "POST /api/projects/proj_1/bridge/memory-candidates",
      "POST /api/projects/proj_1/bridge/skill-candidates",
      "POST /api/projects/proj_1/references/notebook-notes",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
