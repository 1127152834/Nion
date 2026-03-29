import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace navigation exposes a CLI tools entry", async () => {
  const source = await readFile(
    new URL("./workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\/workspace\/cli-tools/);
  assert.match(source, /cliTools/);
});

void test("desktop renderer registers the CLI tools route", async () => {
  const source = await readFile(
    new URL("../../../../desktop/src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\/workspace\/cli-tools/);
});

void test("workspace CLI tools page renders the manager shell", async () => {
  const source = await readFile(
    new URL("../../app/workspace/cli-tools/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /CliToolsManager/);
  assert.match(source, /flex h-full flex-col/);
});
