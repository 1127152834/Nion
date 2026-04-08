import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace page header keeps the shared title bar structure used across modules", async () => {
  const source = await readFile(
    new URL("./workspace-page-header.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /flex items-center justify-between border-b px-6 py-4/);
  assert.match(source, /text-xl font-semibold/);
  assert.match(source, /text-muted-foreground mt-0\.5 text-sm/);
  assert.match(source, /action \? <div className="shrink-0">/);
});

void test("agents, automation, and bridge pages reuse the shared page header", async () => {
  const agentGallery = await readFile(
    new URL("./agents/agent-gallery.tsx", import.meta.url),
    "utf8",
  );
  const automationHome = await readFile(
    new URL("./automation/automation-home-page.tsx", import.meta.url),
    "utf8",
  );
  const automationList = await readFile(
    new URL("./automation/automation-job-list-page.tsx", import.meta.url),
    "utf8",
  );
  const automationDetail = await readFile(
    new URL("./automation/automation-job-detail-page.tsx", import.meta.url),
    "utf8",
  );
  const bridgeLayout = await readFile(
    new URL("./bridge/BridgeLayout.tsx", import.meta.url),
    "utf8",
  );

  assert.match(agentGallery, /WorkspacePageHeader/);
  assert.match(automationHome, /WorkspacePageHeader/);
  assert.match(automationList, /WorkspacePageHeader/);
  assert.match(automationDetail, /WorkspacePageHeader/);
  assert.match(bridgeLayout, /WorkspacePageHeader/);
});
