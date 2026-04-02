import assert from "node:assert/strict";
import test from "node:test";

const {
  archiveNotebookAsset,
  createNotebookNote,
  createNotebookDirectory,
  deleteNotebookDirectory,
  getNotebookDeletePreview,
  loadNotebookAsset,
  loadNotebookImportSources,
  loadNotebookInbox,
  loadNotebookHistoryDetail,
  loadNotebookNotes,
  loadNotebookHistory,
  loadNotebookNote,
  loadNotebookTrash,
  loadNotebookTree,
  moveNotebookNote,
  moveNotebookDirectory,
  previewNotebookAssist,
  applyNotebookAssist,
  renameNotebookDirectory,
  renameNotebookNote,
  restoreDeletedNotebookNote,
  restoreNotebookVersion,
  updateNotebookMetadata,
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

void test("notebook directory helpers hit their expected endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];

  globalThis.fetch = async (input, init) => {
    requests.push(`${init?.method ?? "GET"} ${String(input)} ${String(init?.body ?? "")}`);
    return createJsonResponse({ directory: "projects/beta" });
  };

  try {
    const created = await createNotebookDirectory({
      parent_directory: "projects",
      name: "alpha",
    });
    const renamed = await renameNotebookDirectory({
      directory: "projects/alpha",
      name: "beta",
    });
    const deleted = await deleteNotebookDirectory({
      directory: "projects/beta",
    });
    const moved = await moveNotebookDirectory({
      directory: "projects/beta",
      parent_directory: "archive",
    });

    assert.equal(created, "projects/beta");
    assert.equal(renamed, "projects/beta");
    assert.equal(deleted, "projects/beta");
    assert.equal(moved, "projects/beta");
    assert.deepEqual(requests, [
      'POST /api/notebook/directories {"parent_directory":"projects","name":"alpha"}',
      'POST /api/notebook/directories/rename {"directory":"projects/alpha","name":"beta"}',
      'POST /api/notebook/directories/delete {"directory":"projects/beta"}',
      'POST /api/notebook/directories/move {"directory":"projects/beta","parent_directory":"archive"}',
    ]);
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

void test("loadNotebookInbox calls the inbox endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({
      items: [
        {
          inbox_id: "note:note_1",
          entry_type: "note",
          note_id: "note_1",
          title: "聊天总结",
          relative_path: "收件箱/聊天总结.md",
          created_at: "2026-04-02T00:00:00Z",
          updated_at: "2026-04-02T00:00:00Z",
          summary: "总结内容",
          tags: [],
        },
      ],
    });
  };

  try {
    const items = await loadNotebookInbox();
    assert.match(seenUrl, /\/api\/notebook\/inbox$/);
    assert.equal(items[0]?.entry_type, "note");
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

void test("archiveNotebookAsset posts to the asset archive endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenMethod = "";
  let seenUrl = "";
  let seenBody = "";

  globalThis.fetch = async (input, init) => {
    seenMethod = init?.method ?? "";
    seenUrl = String(input);
    seenBody = String(init?.body ?? "");
    return createJsonResponse({
      asset: {
        asset_id: "asset_1",
        title: "report.html",
        relative_path: "收件箱/report.html",
        absolute_path: "/tmp/notebook/收件箱/report.html",
        source_kind: "workspace_copy",
        mime_type: "text/html",
        created_at: "2026-04-02T00:00:00Z",
        updated_at: "2026-04-02T00:00:00Z",
        file_size: 18,
        tags: [],
      },
    });
  };

  try {
    const asset = await archiveNotebookAsset({
      thread_id: "thread-1",
      artifact_path: "/mnt/user-data/outputs/report.html",
      directory: "",
    });

    assert.equal(seenMethod, "POST");
    assert.match(seenUrl, /\/api\/notebook\/assets\/archive$/);
    assert.match(seenBody, /"thread_id":"thread-1"/);
    assert.equal(asset.asset_id, "asset_1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("loadNotebookAsset reads the asset detail endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({
      asset: {
        asset_id: "asset_1",
        title: "report.html",
        relative_path: "收件箱/report.html",
        absolute_path: "/tmp/notebook/收件箱/report.html",
        source_kind: "workspace_copy",
        mime_type: "text/html",
        created_at: "2026-04-02T00:00:00Z",
        updated_at: "2026-04-02T00:00:00Z",
        file_size: 18,
        tags: [],
      },
    });
  };

  try {
    const asset = await loadNotebookAsset("asset_1");
    assert.match(seenUrl, /\/api\/notebook\/assets\/asset_1$/);
    assert.equal(asset.asset_id, "asset_1");
    assert.equal(asset.source_kind, "workspace_copy");
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
    if (String(input).endsWith("/history/ver_1")) {
      return createJsonResponse({
        entry: {
          version_id: "ver_1",
          note_id: "note_1",
          operation: "edit",
          actor_type: "agent",
          timestamp: "2026-03-26T00:00:00Z",
          path_at_time: "projects/roadmap.md",
        },
        snapshot: {
          note_id: "note_1",
          title: "Roadmap",
          relative_path: "projects/roadmap.md",
          absolute_path: "",
          created_at: "2026-03-26T00:00:00Z",
          updated_at: "2026-03-26T00:00:00Z",
          content_hash: "hash",
          body: "hello",
          tags: ["alpha"],
          is_pinned: true,
        },
      });
    }
    if (String(input).endsWith("/history")) {
      return createJsonResponse({ entries: [] });
    }
    if (String(input).endsWith("/assist-preview")) {
      return createJsonResponse({
        action: "summarize",
        action_label: "生成摘要",
        kind: "derived",
        scope: "whole_note",
        source_excerpt: "hello",
        recommended_mode: "insert",
        available_modes: ["insert", "replace"],
        content: "**摘要：**",
        original_content: "hello",
      });
    }
    if (String(input).endsWith("/assist-apply")) {
      return createJsonResponse({
        note: {
          note_id: "note_1",
          title: "Roadmap",
          relative_path: "projects/roadmap.md",
          absolute_path: "/tmp/notebook/projects/roadmap.md",
          created_at: "2026-03-26T00:00:00Z",
          updated_at: "2026-03-26T00:02:00Z",
          content_hash: "hash-3",
          body: "**摘要：**",
          tags: ["alpha"],
          is_pinned: true,
        },
      });
    }
    if (String(input).endsWith("/delete-preview")) {
      return createJsonResponse({
        note_id: "note_1",
        title: "Roadmap",
        relative_path: "projects/roadmap.md",
        summary: "summary",
      });
    }
    if (String(input).endsWith("/metadata")) {
      return createJsonResponse({
        note: {
          note_id: "note_1",
          title: "Roadmap",
          relative_path: "projects/roadmap.md",
          absolute_path: "/tmp/notebook/projects/roadmap.md",
          created_at: "2026-03-26T00:00:00Z",
          updated_at: "2026-03-26T00:01:00Z",
          content_hash: "hash-2",
          body: "hello",
          tags: ["alpha"],
          is_pinned: true,
        },
      });
    }
    if (String(input).includes("/api/notebook/import-sources?source=chat")) {
      return createJsonResponse({
        items: [
          {
            id: "thread-1:ai-1",
            source: "chat",
            thread_id: "thread-1",
            thread_title: "Alpha 讨论",
            preview_text: "根据您的要求，这是关于 Alpha 项目的最新市场调研总结...",
            content: "根据您的要求，这是关于 Alpha 项目的最新市场调研总结，以下是完整版本。",
            updated_at: "2026-03-28T10:00:00Z",
          },
        ],
      });
    }
    if (String(input).endsWith("/api/notebook/notes")) {
      return createJsonResponse({
        notes: [
          {
            note_id: "note_1",
            title: "Roadmap",
            relative_path: "projects/roadmap.md",
            created_at: "2026-03-26T00:00:00Z",
            updated_at: "2026-03-26T00:00:00Z",
            summary: "summary",
            tags: ["alpha"],
            is_pinned: true,
          },
        ],
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
        tags: [],
        is_pinned: false,
      },
    });
  };

  try {
    await loadNotebookNotes();
    await loadNotebookNote("note_1");
    await renameNotebookNote("note_1", { title: "New Title" });
    await moveNotebookNote("note_1", { directory: "projects/archive" });
    await loadNotebookHistory("note_1");
    await loadNotebookHistoryDetail("note_1", "ver_1");
    await restoreNotebookVersion("note_1", { version_id: "ver_1" });
    await updateNotebookMetadata("note_1", { tags: ["alpha"], is_pinned: true });
    const preview = await previewNotebookAssist("note_1", { action: "summarize" });
    await applyNotebookAssist("note_1", {
      action: "summarize",
      mode: "replace",
      content: "**摘要：**",
      expected_content_hash: "hash",
    });
    const importSources = await loadNotebookImportSources("chat");
    await getNotebookDeletePreview("note_1");
    await restoreDeletedNotebookNote("note_1");

    assert.equal(preview.kind, "derived");
    assert.equal(preview.action_label, "生成摘要");
    assert.equal(preview.recommended_mode, "insert");
    assert.deepEqual(preview.available_modes, ["insert", "replace"]);
    assert.equal(importSources.items[0]?.thread_id, "thread-1");

    assert.deepEqual(urls, [
      "GET /api/notebook/notes",
      "GET /api/notebook/notes/note_1",
      "POST /api/notebook/notes/note_1/rename",
      "POST /api/notebook/notes/note_1/move",
      "GET /api/notebook/notes/note_1/history",
      "GET /api/notebook/notes/note_1/history/ver_1",
      "POST /api/notebook/notes/note_1/restore",
      "PATCH /api/notebook/notes/note_1/metadata",
      "POST /api/notebook/notes/note_1/assist-preview",
      "POST /api/notebook/notes/note_1/assist-apply",
      "GET /api/notebook/import-sources?source=chat",
      "GET /api/notebook/notes/note_1/delete-preview",
      "POST /api/notebook/notes/note_1/restore-deleted",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
