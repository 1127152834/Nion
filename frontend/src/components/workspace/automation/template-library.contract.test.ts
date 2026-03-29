import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation workspace exposes template library surfaces", async () => {
  const pageSource = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );
  const sectionSource = await readFile(
    new URL("./template-library-section.tsx", import.meta.url),
    "utf8",
  ).catch(() => "");

  assert.match(pageSource, /Templates/);
  assert.match(pageSource, /TemplateLibrarySection/);
  assert.match(sectionSource, /Import template/);
  assert.match(sectionSource, /Activate template/);
  assert.match(sectionSource, /router\.push/);
  assert.match(sectionSource, /\/workspace\/automation\/workflows\//);
  assert.match(sectionSource, /\/workspace\/automation\/\$\{/);
  assert.match(sectionSource, /Official templates/);
  assert.match(sectionSource, /Personal templates/);
  assert.match(sectionSource, /View details/);
  assert.match(sectionSource, /Import failed|importTemplate\.error|createJob\.error/);
});
