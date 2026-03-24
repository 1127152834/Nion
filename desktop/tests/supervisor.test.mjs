import test from "node:test";
import assert from "node:assert/strict";

import { buildBackendCommand } from "../dist/main/backend-supervisor.js";

test("backend supervisor resolves helper path outside ASAR", () => {
  const cmd = buildBackendCommand({
    resourcesPath: "/tmp/Nion.app/Contents/Resources",
    platform: "darwin"
  });
  assert.match(cmd.executable, /Resources\/backend\//);
  assert.equal(cmd.executable.includes(".asar"), false);
});
