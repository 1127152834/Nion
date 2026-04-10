import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop main creates the window before bridge runtime restoration", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  const createWindowIndex = source.indexOf("mainWindow = await createMainWindow(");
  const restoreBridgeIndex = source.indexOf("await restoreBridgeRuntimeIfNeeded();");

  assert.notEqual(createWindowIndex, -1);
  assert.notEqual(restoreBridgeIndex, -1);
  assert.ok(
    createWindowIndex < restoreBridgeIndex,
    "createMainWindow must happen before restoreBridgeRuntimeIfNeeded to avoid a blank/no-window launch",
  );
});

test("desktop main primes the backend URL and creates the window before daemon startup completes", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  const backendUrlIndex = source.indexOf(
    'process.env.NION_DESKTOP_BACKEND_URL = daemonCommand.urls.base;',
  );
  const createWindowIndex = source.indexOf("mainWindow = await createMainWindow(");
  const ensureDaemonIndex = source.indexOf("runtimeInfo = await ensureLocalDaemon(daemonCommand);");
  const clientSessionIndex = source.indexOf(
    "clientSession = await createElectronClientSession(runtimeInfo.baseUrl);",
  );

  assert.notEqual(backendUrlIndex, -1);
  assert.notEqual(createWindowIndex, -1);
  assert.notEqual(ensureDaemonIndex, -1);
  assert.notEqual(clientSessionIndex, -1);
  assert.ok(
    backendUrlIndex < createWindowIndex,
    "the preload bridge must receive a backend base URL before the window is created",
  );
  assert.ok(
    createWindowIndex < ensureDaemonIndex,
    "createMainWindow must not wait for ensureLocalDaemon when launching the desktop shell",
  );
  assert.ok(
    createWindowIndex < clientSessionIndex,
    "createMainWindow must not wait for Electron client session registration",
  );
});
