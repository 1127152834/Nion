import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("chat box browses thread user-data root and outputs for artifact/runtime panels", async () => {
  const source = await readFile(new URL("./chat-box.tsx", import.meta.url), "utf8");

  assert.match(source, /root: "\/mnt\/user-data"/);
  assert.match(source, /root: "\/mnt\/user-data\/outputs"/);
});

void test("working-directory panel auto-selects the first file so the preview pane does not stay empty", async () => {
  const source = await readFile(new URL("./chat-box.tsx", import.meta.url), "utf8");

  assert.match(source, /panelType === "working-directory"/);
  assert.match(source, /!selectedArtifact/);
  assert.match(source, /workingDirectoryFiles\.length > 0/);
  assert.match(source, /selectArtifact\(workingDirectoryFiles\[0]!\)/);
});

void test("chat box passes the current panel type into the file list so working-directory clicks do not switch back to artifacts mode", async () => {
  const source = await readFile(new URL("./chat-box.tsx", import.meta.url), "utf8");

  assert.match(source, /<ArtifactFileList[\s\S]*panelType=\{panelType\}/);
});
