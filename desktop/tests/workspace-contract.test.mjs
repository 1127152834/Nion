import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop workspace defines builder and forge packaging scripts", () => {
  const pkg = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.ok(pkg.scripts["package:builder"]);
  assert.ok(pkg.scripts["package:forge"]);
  assert.ok(pkg.scripts["build:helper"]);
});

test("desktop renderer wires the project workspace routes", () => {
  const source = fs.readFileSync(
    new URL("../src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /path="\/workspace\/projects"/);
  assert.match(source, /path="\/workspace\/projects\/:project_id"/);
  assert.match(source, /path="\/workspace\/projects\/:project_id\/threads\/:thread_id"/);
});

test("desktop renderer wires notebook and memory workspace routes without self-maintenance", () => {
  const source = fs.readFileSync(
    new URL("../src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /path="\/workspace\/notebook"/);
  assert.match(source, /path="\/workspace\/notebook\/trash"/);
  assert.match(source, /path="\/workspace\/memory"/);
  assert.match(source, /path="\/workspace\/memory\/search"/);
  assert.match(source, /path="\/workspace\/memory\/search\/results"/);
  assert.match(source, /path="\/workspace\/memory\/user"/);
  assert.match(source, /path="\/workspace\/memory\/history"/);
  assert.match(source, /path="\/workspace\/memory\/facts"/);
  assert.doesNotMatch(source, /path="\/workspace\/self-maintenance"/);
});

test("desktop renderer wires the multi-page automation workspace routes", () => {
  const source = fs.readFileSync(
    new URL("../src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /path="\/workspace\/automation"/);
  assert.match(source, /path="\/workspace\/automation\/reminders"/);
  assert.match(source, /path="\/workspace\/automation\/reminders\/:jobId"/);
  assert.match(source, /path="\/workspace\/automation\/tasks"/);
  assert.match(source, /path="\/workspace\/automation\/tasks\/:jobId"/);
  assert.match(source, /DesktopAutomationReminderDetailRoute/);
  assert.match(source, /DesktopAutomationTaskDetailRoute/);
  assert.match(source, /useParams<\{ jobId: string \}>/);
  assert.doesNotMatch(source, /import AutomationReminderDetailPage from "@\/app\/workspace\/automation\/reminders\/\[jobId\]\/page"/);
  assert.doesNotMatch(source, /import AutomationTaskDetailPage from "@\/app\/workspace\/automation\/tasks\/\[jobId\]\/page"/);
});

test("desktop renderer wires the dedicated new-agent route", () => {
  const source = fs.readFileSync(
    new URL("../src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /path="\/workspace\/agents\/new"/);
});
