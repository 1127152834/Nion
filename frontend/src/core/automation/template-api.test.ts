import assert from "node:assert/strict";
import test from "node:test";

const { activateAutomationTemplate, exportAutomationJobTemplate, importAutomationTemplate, loadAutomationTemplate, loadAutomationTemplates, saveAutomationTemplate } = await import(
  new URL("./api.ts", import.meta.url).href,
);

function createJsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

void test("exportAutomationJobTemplate calls the export endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({
      manifest: { manifest_version: "1", job: {}, package: { files: [] } },
      files: {},
    });
  };

  try {
    await exportAutomationJobTemplate("job-1");
    assert.match(seenUrl, /\/api\/automation\/jobs\/job-1\/export$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("importAutomationTemplate posts manifest and files", async () => {
  const originalFetch = globalThis.fetch;
  let seenMethod = "";
  let seenBody = "";

  globalThis.fetch = async (_input, init) => {
    seenMethod = String(init?.method ?? "");
    seenBody = String(init?.body ?? "");
    return createJsonResponse({ job: { id: "job-2", job_kind: "workflow" } }, { status: 201 });
  };

  try {
    const result = await importAutomationTemplate({
      manifest: { manifest_version: "1", job: { name: "Imported workflow" }, package: { files: [] } },
      files: {},
    });

    assert.equal(seenMethod, "POST");
    assert.match(seenBody, /"manifest_version":"1"/);
    assert.equal(result.id, "job-2");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("loadAutomationTemplates calls the template library endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({
      official: [{ id: "tpl-official-1", name: "Reply finished reminder", scope: "official" }],
      personal: [],
    });
  };

  try {
    const result = await loadAutomationTemplates();

    assert.match(seenUrl, /\/api\/automation\/templates$/);
    assert.equal(result.official[0].id, "tpl-official-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("loadAutomationTemplate calls the template detail endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenUrl = "";

  globalThis.fetch = async (input) => {
    seenUrl = String(input);
    return createJsonResponse({
      template: { id: "tpl-personal-1", name: "Saved workflow", scope: "personal", manifest: {} },
    });
  };

  try {
    const result = await loadAutomationTemplate("tpl-personal-1");
    assert.match(seenUrl, /\/api\/automation\/templates\/tpl-personal-1$/);
    assert.equal(result.id, "tpl-personal-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("saveAutomationTemplate posts a personal template payload", async () => {
  const originalFetch = globalThis.fetch;
  let seenMethod = "";
  let seenBody = "";

  globalThis.fetch = async (_input, init) => {
    seenMethod = String(init?.method ?? "");
    seenBody = String(init?.body ?? "");
    return createJsonResponse({ id: "tpl-personal-1", scope: "personal" }, { status: 201 });
  };

  try {
    const result = await saveAutomationTemplate({
      id: "tpl-personal-1",
      name: "Saved workflow",
      scope: "personal",
      manifest: { manifest_version: "1", job: {}, package: { files: [] } },
      files: {},
    });

    assert.equal(seenMethod, "POST");
    assert.match(seenBody, /"scope":"personal"/);
    assert.equal(result.id, "tpl-personal-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

void test("activateAutomationTemplate posts to the activate endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let seenMethod = "";
  let seenUrl = "";

  globalThis.fetch = async (input, init) => {
    seenMethod = String(init?.method ?? "");
    seenUrl = String(input);
    return createJsonResponse({ job: { id: "job-3", job_kind: "workflow" } }, { status: 201 });
  };

  try {
    const result = await activateAutomationTemplate("tpl-personal-1");

    assert.equal(seenMethod, "POST");
    assert.match(seenUrl, /\/api\/automation\/templates\/tpl-personal-1\/activate$/);
    assert.equal(result.id, "job-3");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
