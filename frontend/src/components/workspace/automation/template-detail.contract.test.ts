import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("template detail page shows manifest and activation actions", async () => {
  const pageSource = await readFile(
    new URL("../app/workspace/automation/templates/[template_id]/page.tsx", import.meta.url),
    "utf8",
  ).catch(async () =>
    readFile(
      new URL("../../../app/workspace/automation/templates/[template_id]/page.tsx", import.meta.url),
      "utf8",
    ),
  );
  const detailSource = await readFile(
    new URL("./template-detail-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /TemplateDetailPage/);
  assert.match(detailSource, /Template manifest/);
  assert.match(detailSource, /Activate template/);
  assert.match(detailSource, /useActivateAutomationTemplate/);
  assert.match(detailSource, /manifest_version/);
  assert.match(detailSource, /job_kind/);
});
