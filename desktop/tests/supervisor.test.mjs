import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { buildBackendCommand } from "../dist/main/backend-supervisor.js";

test("backend supervisor resolves helper path outside ASAR", () => {
  const cmd = buildBackendCommand({
    appRoot: "/tmp/Nion.app/Contents/Resources/app.asar",
    resourcesPath: "/tmp/Nion.app/Contents/Resources",
    userDataPath: "/tmp/nion-user-data",
    platform: "darwin",
    packaged: true,
  });
  assert.match(cmd.executable, /Resources\/backend\//);
  assert.equal(cmd.executable.includes("app.asar"), false);
});

test("backend supervisor uses source helper in development mode", () => {
  const cmd = buildBackendCommand({
    appRoot: "/tmp/nion",
    resourcesPath: "/tmp/resources",
    userDataPath: "/tmp/nion-user-data",
    platform: "darwin",
    packaged: false,
  });

  assert.equal(cmd.executable, "uv");
  assert.deepEqual(cmd.args, ["run", "python", "-m", "app.desktop_helper"]);
  assert.equal(cmd.cwd, path.join("/tmp/nion", "backend"));
  assert.match(cmd.env.PYTHONPATH ?? "", /packages\/harness/);
  assert.equal(cmd.env.NION_DESKTOP_HELPER_PORT, "43115");
});
