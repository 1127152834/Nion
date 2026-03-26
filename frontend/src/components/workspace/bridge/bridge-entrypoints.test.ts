import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace nav menu routes to the new bridge page", async () => {
  const source = await readFile(
    new URL("../workspace-nav-menu.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /router\.push\("\/workspace\/bridge"\)/);
});

void test("command palette routes to the new bridge page", async () => {
  const source = await readFile(
    new URL("../command-palette.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /router\.push\("\/workspace\/bridge"\)/);
});

void test("desktop renderer registers the bridge route", async () => {
  const source = await readFile(
    new URL("../../../../../desktop/src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /import BridgePage from "@\/app\/workspace\/bridge\/page";/);
  assert.match(source, /path="\/workspace\/bridge"/);
});
