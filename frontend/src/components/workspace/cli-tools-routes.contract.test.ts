import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace navigation does not expose a top-level CLI tools entry", async () => {
  const source = await readFile(
    new URL("./workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\/workspace\/cli-tools/);
});

void test("desktop renderer does not register a dedicated workspace CLI tools route", async () => {
  const source = await readFile(
    new URL("../../../../desktop/src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\/workspace\/cli-tools/);
});
