import assert from "node:assert/strict";
import test from "node:test";

import { summarizeNotebookHistoryEntry } from "./notebook-history-summary.ts";

void test("summarizeNotebookHistoryEntry derives added and removed character counts from diff text", () => {
  const summary = summarizeNotebookHistoryEntry({
    actor_type: "user",
    diff_text: [
      "--- before.md",
      "+++ after.md",
      "@@ -1 +1,2 @@",
      "-旧内容",
      "+新内容",
      "+第二行",
    ].join("\n"),
    operation: "edit",
    path_at_time: "projects/roadmap.md",
    timestamp: "2026-03-30T10:00:00Z",
    version_id: "ver_1",
    note_id: "note_1",
    parent_version_id: "ver_0",
    restored_from_version_id: null,
    trash_path: null,
    content_hash_after: "hash-2",
  });

  assert.equal(summary.title, "新增 6 字，删除 3 字");
  assert.equal(summary.description, "编辑内容");
});

void test("summarizeNotebookHistoryEntry maps rename, move, restore and create to human labels", () => {
  assert.equal(
    summarizeNotebookHistoryEntry({
      actor_type: "user",
      diff_text: "",
      operation: "rename",
      path_at_time: "projects/beta.md",
      timestamp: "2026-03-30T10:00:00Z",
      version_id: "ver_2",
      note_id: "note_1",
      parent_version_id: "ver_1",
      restored_from_version_id: null,
      trash_path: null,
      content_hash_after: "hash-3",
    }).title,
    "重命名笔记",
  );

  assert.equal(
    summarizeNotebookHistoryEntry({
      actor_type: "user",
      diff_text: "",
      operation: "move",
      path_at_time: "projects/archive/beta.md",
      timestamp: "2026-03-30T10:00:00Z",
      version_id: "ver_3",
      note_id: "note_1",
      parent_version_id: "ver_2",
      restored_from_version_id: null,
      trash_path: null,
      content_hash_after: "hash-4",
    }).description,
    "移动到 projects/archive/beta.md",
  );

  assert.equal(
    summarizeNotebookHistoryEntry({
      actor_type: "user",
      diff_text: "",
      operation: "restore",
      path_at_time: "projects/archive/beta.md",
      timestamp: "2026-03-30T10:00:00Z",
      version_id: "ver_4",
      note_id: "note_1",
      parent_version_id: "ver_3",
      restored_from_version_id: "ver_1",
      trash_path: null,
      content_hash_after: "hash-5",
    }).title,
    "恢复到历史版本",
  );

  assert.equal(
    summarizeNotebookHistoryEntry({
      actor_type: "user",
      diff_text: "",
      operation: "create",
      path_at_time: "projects/new.md",
      timestamp: "2026-03-30T10:00:00Z",
      version_id: "ver_0",
      note_id: "note_2",
      parent_version_id: null,
      restored_from_version_id: null,
      trash_path: null,
      content_hash_after: "hash-1",
    }).title,
    "创建笔记",
  );
});
