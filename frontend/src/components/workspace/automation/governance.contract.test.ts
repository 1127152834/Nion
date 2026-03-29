import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation workspace exposes governance queue and audit surfaces", async () => {
  const pageSource = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );
  const tabsSource = await readFile(
    new URL("./automation-kind-tabs.tsx", import.meta.url),
    "utf8",
  );
  const queueSource = await readFile(
    new URL("./approval-queue-section.tsx", import.meta.url),
    "utf8",
  ).catch(() => "");
  const auditSource = await readFile(
    new URL("./audit-history-section.tsx", import.meta.url),
    "utf8",
  ).catch(() => "");

  assert.match(tabsSource, /governance/);
  assert.match(pageSource, /ApprovalQueueSection/);
  assert.match(pageSource, /AuditHistorySection/);
  assert.match(pageSource, /value="governance"/);
  assert.match(pageSource, /requestApproval\.error|decideApproval\.error/);
  assert.match(queueSource, /Approve/);
  assert.match(queueSource, /Deny/);
  assert.match(queueSource, /Approval queue/);
  assert.match(auditSource, /Audit history/);
  assert.match(auditSource, /approval\./);
  assert.match(pageSource, /runJob\.error/);
});

void test("automation job cards expose ownership and visibility badges", async () => {
  const sectionSource = await readFile(
    new URL("./automation-job-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(sectionSource, /owner_id/);
  assert.match(sectionSource, /visibility/);
  assert.match(sectionSource, /approval_policy/);
  assert.match(sectionSource, /Request approval/);
});
