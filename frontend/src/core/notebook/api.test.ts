import assert from "node:assert/strict";
import test from "node:test";

const {
  createNotebookNote,
  getNotebookDeletePreview,
  loadNotebookHistory,
  loadNotebookNote,
  loadNotebookTrash,
  loadNotebookTree,
  moveNotebookNote,
  renameNotebookNote,
  restoreDeletedNotebookNote,
  restoreNotebookVersion,
  updateNotebookNote,
} = await import(new URL("./api.ts", import.meta.url).href);

function createJsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

void test("loadNotebookTree calls the notebook tree endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({
      root: "/tmp/notebook",
      generated_at: "2026-03-26T00:00:00Z",
      depth: 6,
      truncated: false,
      directories: [],
      files: [],
    });
  };

  try {
    await loadNotebookTree();
    assert.match(seenUrl, /\/api\/notebook\/tree$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("loadNotebookTrash calls the trash endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({ notes: [] });
  };

  try {
    await loadNotebookTrash();
    assert.match(seenUrl, /\/api\/notebook\/trash$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("createNotebookNote posts to the create endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenMethod = "";
  let seenBody = "";

  globalThis.fetch = async (_input, init) => {
    seenMethod = init?.method ?? "";
    seenBody = String(init?.body ?? "");
    return createJsonResponse({
      note: {
        note_id: "note_1",
        title: "Roadmap",
        relative_path: "projects/roadmap.md",
        absolute_path: "/tmp/notebook/projects/roadmap.md",
        created_at: "2026-03-26T00:00:00Z",
        updated_at: "2026-03-26T00:00:00Z",
        content_hash: "hash",
        body: "hello",
      },
    });
  };

  try {
    const result = await createNotebookNote({
      directory: "projects",
      title: "Roadmap",
      body: "hello",
    });

    assert.equal(seenMethod, "POST");
    assert.match(seenBody, /"title":"Roadmap"/);
    assert.equal(result.note_id, "note_1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("updateNotebookNote uses put and returns the updated note", async () => {
  const originalFetch = globalThis.fetch;
  let seenMethod = "";
  let seenUrl = "";

  globalThis.fetch = async (input, init) => {
    seenMethod = init?.method ?? "";
    seenUrl = String(input);
    return createJsonResponse({
      note: {
        note_id: "note_1",
        title: "Roadmap",
        relative_path: "projects/roadmap.md",
        absolute_path: "/tmp/notebook/projects/roadmap.md",
        created_at: "2026-03-26T00:00:00Z",
        updated_at: "2026-03-26T00:01:00Z",
        content_hash: "hash-2",
        body: "updated",
      },
    });
  };

  try {
    const result = await updateNotebookNote("note_1", {
      body: "updated",
      expected_content_hash: "hash-1",
    });

    assert.equal(seenMethod, "PUT");
    assert.match(seenUrl, /\/api\/notebook\/notes\/note_1$/);
    assert.equal(result.content_hash, "hash-2");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("notebook detail helpers hit their expected endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];

  globalThis.fetch = async (input, init) => {
    urls.push(`${init?.method ?? "GET"} ${String(input)}`);
    if (String(input).endsWith("/history")) {
      return createJsonResponse({ entries: [] });
    }
    if (String(input).endsWith("/delete-preview")) {
      return createJsonResponse({
        note_id: "note_1",
        title: "Roadmap",
        relative_path: "projects/roadmap.md",
        summary: "summary",
      });
    }
    return createJsonResponse({
      note: {
        note_id: "note_1",
        title: "Roadmap",
        relative_path: "projects/roadmap.md",
        absolute_path: "/tmp/notebook/projects/roadmap.md",
        created_at: "2026-03-26T00:00:00Z",
        updated_at: "2026-03-26T00:00:00Z",
        content_hash: "hash",
        body: "hello",
      },
    });
  };

  try {
    await loadNotebookNote("note_1");
    await renameNotebookNote("note_1", { title: "New Title" });
    await moveNotebookNote("note_1", { directory: "projects/archive" });
    await loadNotebookHistory("note_1");
    await restoreNotebookVersion("note_1", { version_id: "ver_1" });
    await getNotebookDeletePreview("note_1");
    await restoreDeletedNotebookNote("note_1");

    assert.deepEqual(urls, [
      "GET /api/notebook/notes/note_1",
      "POST /api/notebook/notes/note_1/rename",
      "POST /api/notebook/notes/note_1/move",
      "GET /api/notebook/notes/note_1/history",
      "POST /api/notebook/notes/note_1/restore",
      "GET /api/notebook/notes/note_1/delete-preview",
      "POST /api/notebook/notes/note_1/restore-deleted",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
