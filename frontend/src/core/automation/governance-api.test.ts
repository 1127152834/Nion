import assert from "node:assert/strict";
import test from "node:test";

const {
  decideAutomationApproval,
  loadAutomationApprovals,
  loadAutomationAudit,
  requestAutomationApproval,
} = await import(new URL("./api.ts", import.meta.url).href);

function createJsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

void test("loadAutomationApprovals calls approvals endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({ approvals: [] });
  };

  try {
    await loadAutomationApprovals();
    assert.match(seenUrl, /\/api\/automation\/approvals$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("requestAutomationApproval posts request payload", async () => {
  const originalFetch = globalThis.fetch;
  let seenMethod = "";
  let seenBody = "";

  globalThis.fetch = async (_input, init) => {
    seenMethod = String(init?.method ?? "");
    seenBody = String(init?.body ?? "");
    return createJsonResponse({ approval: { id: "approval-1" } }, { status: 201 });
  };

  try {
    await requestAutomationApproval("job-1", { actor_id: "user-2", reason: "High-risk action" });
    assert.equal(seenMethod, "POST");
    assert.match(seenBody, /"actor_id":"user-2"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("decideAutomationApproval posts decision payload", async () => {
  const originalFetch = globalThis.fetch;
  let seenMethod = "";
  let seenBody = "";

  globalThis.fetch = async (_input, init) => {
    seenMethod = String(init?.method ?? "");
    seenBody = String(init?.body ?? "");
    return createJsonResponse({ approval: { id: "approval-1", status: "approved" } });
  };

  try {
    await decideAutomationApproval("approval-1", { actor_id: "approver-1", decision: "approved" });
    assert.equal(seenMethod, "POST");
    assert.match(seenBody, /"decision":"approved"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("loadAutomationAudit calls audit endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({ audit: [] });
  };

  try {
    await loadAutomationAudit();
    assert.match(seenUrl, /\/api\/automation\/audit$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
