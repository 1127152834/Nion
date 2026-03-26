import assert from "node:assert/strict";
import test from "node:test";

import { buildNotebookTree } from "./tree.ts";
import type { NotebookTreeResponse } from "./types.ts";

const tree: NotebookTreeResponse = {
  root: "/tmp/notebook",
  generated_at: "2026-03-26T00:00:00Z",
  depth: 8,
  truncated: false,
  directories: [
    {
      path: "projects",
      name: "projects",
      depth: 1,
      child_count: 1,
      mtime: null,
    },
    {
      path: "projects/alpha",
      name: "alpha",
      depth: 2,
      child_count: 1,
      mtime: null,
    },
  ],
  files: [
    {
      note_id: "note_a",
      path: "projects/alpha/roadmap.md",
      name: "roadmap.md",
      depth: 3,
      size: 100,
      mtime: null,
    },
    {
      note_id: "note_b",
      path: "inbox.md",
      name: "inbox.md",
      depth: 1,
      size: 80,
      mtime: null,
    },
  ],
};

void test("buildNotebookTree nests directories and preserves root files", () => {
  const nodes = buildNotebookTree(tree);
  const projects = nodes[0];
  if (projects?.kind !== "directory") {
    assert.fail("expected projects directory");
  }
  const alpha = projects.children[0];
  if (alpha?.kind !== "directory") {
    assert.fail("expected alpha directory");
  }
  const roadmap = alpha.children[0];
  if (roadmap?.kind !== "file") {
    assert.fail("expected roadmap file");
  }
  const inbox = nodes[1];
  if (inbox?.kind !== "file") {
    assert.fail("expected inbox file");
  }

  assert.equal(nodes.length, 2);
  assert.equal(projects.path, "projects");
  assert.equal(alpha.path, "projects/alpha");
  assert.equal(roadmap.path, "projects/alpha/roadmap.md");
  assert.equal(inbox.path, "inbox.md");
});
