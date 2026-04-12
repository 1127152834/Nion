import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop main registers the runtime info IPC handler before creating the renderer window", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  const registerRuntimeInfoIndex = source.indexOf("ipcMain.handle(DESKTOP_IPC_CHANNELS.runtimeInfo");
  const createWindowIndex = source.indexOf("mainWindow = await createMainWindow(");

  assert.notEqual(registerRuntimeInfoIndex, -1);
  assert.notEqual(createWindowIndex, -1);
  assert.ok(
    registerRuntimeInfoIndex < createWindowIndex,
    "runtime info IPC handler must be available before the renderer starts requesting desktop runtime info",
  );
});
