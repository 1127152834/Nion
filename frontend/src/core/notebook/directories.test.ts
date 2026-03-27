import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNotebookDirectoryOptions,
  findDefaultNotebookDirectory,
  formatNotebookDirectoryLabel,
} from "./directories.ts";

void test("buildNotebookDirectoryOptions always includes inbox first", () => {
  const options = buildNotebookDirectoryOptions({
    entries: [
      { path: "projects/alpha", name: "alpha", depth: 2, child_count: 0, mtime: null },
      { path: "projects", name: "projects", depth: 1, child_count: 1, mtime: null },
    ],
    inboxLabel: "收件箱",
  });

  assert.equal(options[0]?.path, "inbox");
  assert.equal(options[0]?.label, "收件箱");
  assert.equal(options[1]?.label, "projects");
  assert.equal(options[2]?.label, "projects / alpha");
});

void test("findDefaultNotebookDirectory prefers explicit directory then current note folder", () => {
  const options = buildNotebookDirectoryOptions({
    entries: [
      { path: "projects", name: "projects", depth: 1, child_count: 1, mtime: null },
      { path: "projects/alpha", name: "alpha", depth: 2, child_count: 0, mtime: null },
    ],
  });

  assert.equal(
    findDefaultNotebookDirectory({
      options,
      preferredDirectory: "projects/alpha",
      selectedNotePath: "projects/roadmap.md",
    }),
    "projects/alpha",
  );

  assert.equal(
    findDefaultNotebookDirectory({
      options,
      selectedNotePath: "projects/roadmap.md",
    }),
    "projects",
  );

  assert.equal(findDefaultNotebookDirectory({ options }), "inbox");
});

void test("formatNotebookDirectoryLabel renders a human-friendly hierarchy", () => {
  assert.equal(formatNotebookDirectoryLabel("projects/alpha"), "projects / alpha");
});
