import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("artifact file list forwards working-directory selections without forcing artifacts panel mode", async () => {
  const source = await readFile(new URL("./artifact-file-list.tsx", import.meta.url), "utf8");

  assert.match(source, /panelType = "artifacts"/);
  assert.match(source, /selectArtifact\(filepath, false, panelType\)/);
  assert.doesNotMatch(source, /selectArtifact\(filepath\);/);
});
