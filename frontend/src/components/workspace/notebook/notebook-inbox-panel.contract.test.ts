import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookInboxPanel renders inbox-first mixed note and asset feed", async () => {
  const source = await readFile(new URL("./notebook-inbox-panel.tsx", import.meta.url), "utf8");

  assert.match(source, /export function NotebookInboxPanel/);
  assert.match(source, /inboxItems:/);
  assert.match(source, /entry_type === "asset"|entry\.entry_type === "asset"/);
  assert.match(source, /entry_type === "note"|entry\.entry_type === "note"/);
  assert.match(source, /Inbox|收件箱/);
  assert.match(source, /Recent|最近/);
});
