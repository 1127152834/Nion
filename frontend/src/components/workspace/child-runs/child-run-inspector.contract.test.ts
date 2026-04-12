import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("child run inspector is driven from the sidebar and the main message list keeps only a summary", async () => {
  const sidebarSource = await readFile(
    new URL("../workspace-sidebar-child-runs.tsx", import.meta.url),
    "utf8",
  );
  const inspectorSource = await readFile(
    new URL("./child-run-inspector.tsx", import.meta.url),
    "utf8",
  );
  const messageListSource = await readFile(
    new URL("../messages/message-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(sidebarSource, /ChildRunInspector/);
  assert.match(sidebarSource, /ChildRunList/);
  assert.match(inspectorSource, /Dialog/);
  assert.match(messageListSource, /DelegationSummary/);
});
