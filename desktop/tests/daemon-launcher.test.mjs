import test from "node:test";
import assert from "node:assert/strict";

import { buildDaemonCommand } from "../dist/main/config.js";

test("desktop config resolves the daemon entrypoint in development mode", () => {
  const command = buildDaemonCommand({
    appRoot: "/tmp/nion",
    resourcesPath: "/tmp/resources",
    userDataPath: "/tmp/nion-user-data",
    platform: "darwin",
    packaged: false,
  });

  assert.equal(command.executable, "uv");
  assert.deepEqual(command.args, ["run", "python", "-m", "app.daemon.main"]);
});
