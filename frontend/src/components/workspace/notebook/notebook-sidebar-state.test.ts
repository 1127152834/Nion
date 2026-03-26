import assert from "node:assert/strict";
import test from "node:test";

import type { NotebookFileEntry, NotebookTreeNode } from "@/core/notebook";

import {
  buildRecentNotebookFiles,
  collectRootNotebookFiles,
  filterNotebookTreeNodes,
} from "./notebook-sidebar-state.ts";

void test("buildRecentNotebookFiles sorts by mtime desc and caps results", () => {
  const recent = buildRecentNotebookFiles(
    [
      { note_id: "a", path: "a.md", name: "a.md", depth: 1, size: 1, mtime: 1 },
      { note_id: "b", path: "b.md", name: "b.md", depth: 1, size: 1, mtime: 5 },
      { note_id: "c", path: "c.md", name: "c.md", depth: 1, size: 1, mtime: 3 },
    ] satisfies NotebookFileEntry[],
    2,
  );

  assert.deepEqual(recent.map((item) => item.note_id), ["b", "c"]);
});

void test("collectRootNotebookFiles returns only root-level file nodes", () => {
  const roots = collectRootNotebookFiles([
    {
      kind: "directory",
      path: "projects",
      name: "projects",
      depth: 1,
      children: [],
    },
    {
      kind: "file",
      path: "inbox.md",
      name: "inbox.md",
      depth: 1,
      note_id: "note_inbox",
    },
  ] satisfies NotebookTreeNode[]);

  assert.equal(roots.length, 1);
  assert.equal(roots[0]?.kind, "file");
  assert.equal(roots[0]?.path, "inbox.md");
});

void test("filterNotebookTreeNodes keeps nested directories when descendants match the query", () => {
  const filtered = filterNotebookTreeNodes(
    [
      {
        kind: "directory",
        path: "projects",
        name: "projects",
        depth: 1,
        children: [
          {
            kind: "directory",
            path: "projects/alpha",
            name: "alpha",
            depth: 2,
            children: [
              {
                kind: "file",
                path: "projects/alpha/roadmap.md",
                name: "roadmap.md",
                depth: 3,
                note_id: "note_roadmap",
              },
            ],
          },
        ],
      },
      {
        kind: "file",
        path: "inbox.md",
        name: "inbox.md",
        depth: 1,
        note_id: "note_inbox",
      },
    ] satisfies NotebookTreeNode[],
    "roadmap",
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.kind, "directory");
  assert.equal(filtered[0]?.path, "projects");
});
