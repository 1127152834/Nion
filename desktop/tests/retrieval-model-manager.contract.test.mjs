import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop IPC exposes retrieval model manager entrypoints", () => {
  const source = fs.readFileSync(
    new URL("../src/shared/ipc.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /retrievalModelsList/);
  assert.match(source, /retrievalPacksList/);
  assert.match(source, /retrievalModelDownload/);
  assert.match(source, /retrievalModelCancel/);
  assert.match(source, /retrievalModelRemove/);
  assert.match(source, /retrievalModelImport/);
  assert.match(source, /retrievalPackDownload/);
  assert.match(source, /retrievalPackCancel/);
  assert.match(source, /retrievalPackRemove/);
  assert.match(source, /retrievalPackImport/);
  assert.match(source, /retrievalModelDownloadProgress/);
});

test("desktop preload exposes retrieval model bridge methods", () => {
  const source = fs.readFileSync(
    new URL("../src/preload/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /listRetrievalModels/);
  assert.match(source, /listRetrievalPacks/);
  assert.match(source, /downloadRetrievalModel/);
  assert.match(source, /cancelRetrievalModel/);
  assert.match(source, /removeRetrievalModel/);
  assert.match(source, /importRetrievalModel/);
  assert.match(source, /downloadRetrievalPack/);
  assert.match(source, /cancelRetrievalPack/);
  assert.match(source, /removeRetrievalPack/);
  assert.match(source, /importRetrievalPack/);
  assert.match(source, /onRetrievalModelDownloadProgress/);
});

test("desktop main wires retrieval model IPC handlers", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /RetrievalModelManager/);
  assert.match(source, /DESKTOP_IPC_CHANNELS\.retrievalModelsList/);
  assert.match(source, /DESKTOP_IPC_CHANNELS\.retrievalPacksList/);
  assert.match(source, /DESKTOP_IPC_CHANNELS\.retrievalModelDownload/);
  assert.match(source, /DESKTOP_IPC_CHANNELS\.retrievalPackDownload/);
  assert.match(source, /retrievalModelDownloadProgress/);
});
