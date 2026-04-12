import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace sidebar renders child runs through a dedicated sidebar panel", async () => {
  const sidebarSource = await readFile(
    new URL("./workspace-sidebar.tsx", import.meta.url),
    "utf8",
  );
  const panelSource = await readFile(
    new URL("./workspace-sidebar-child-runs.tsx", import.meta.url),
    "utf8",
  );

  assert.match(sidebarSource, /WorkspaceSidebarChildRuns/);
  assert.match(panelSource, /useChildRuns/);
  assert.match(panelSource, /ChildRunList/);
  assert.match(panelSource, /ChildRunInspector/);
});
