import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  pathOfKnowledge,
  pathOfKnowledgeGraph,
  pathOfKnowledgeQuery,
  pathOfKnowledgeQueue,
} from "../../../core/navigation/desktop-routes.ts";

void test("workspace route helpers expose dedicated knowledge routes", () => {
  assert.equal(pathOfKnowledge(), "/workspace/knowledge");
  assert.equal(pathOfKnowledgeQueue(), "/workspace/knowledge/queue");
  assert.equal(pathOfKnowledgeGraph(), "/workspace/knowledge/graph");
  assert.equal(pathOfKnowledgeQuery(), "/workspace/knowledge/query");
});

void test("workspace navigation exposes notebook knowledge and memory as separate surfaces", async () => {
  const navMenuSource = await readFile(
    new URL("../workspace-nav-menu.tsx", import.meta.url),
    "utf8",
  );
  const commandPaletteSource = await readFile(
    new URL("../command-palette.tsx", import.meta.url),
    "utf8",
  );

  for (const source of [navMenuSource, commandPaletteSource]) {
    assert.match(source, /t\.sidebar\.notebook/);
    assert.match(source, /t\.sidebar\.knowledge/);
    assert.match(source, /t\.sidebar\.memory/);
    assert.match(source, /pathOfNotebook/);
    assert.match(source, /pathOfKnowledge/);
    assert.match(source, /pathOfMemory/);
  }
});

void test("desktop renderer registers all knowledge routes", async () => {
  const source = await readFile(
    new URL("../../../../../desktop/src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /"\/workspace\/knowledge"/);
  assert.match(source, /"\/workspace\/knowledge\/queue"/);
  assert.match(source, /"\/workspace\/knowledge\/graph"/);
  assert.match(source, /"\/workspace\/knowledge\/query"/);
  assert.match(source, /"\/workspace\/knowledge\/pages\/:pageId"/);
  assert.match(source, /DesktopKnowledgePageDetailRoute/);
});
