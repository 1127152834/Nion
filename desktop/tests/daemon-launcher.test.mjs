import test from "node:test";
import assert from "node:assert/strict";

import { buildDaemonCommand } from "../dist/main/config.js";
import { shouldReuseDaemon } from "../dist/main/daemon-launcher.js";

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
  assert.equal(command.env.NION_DAEMON_ALLOW_BACKGROUND_RUNNING, "1");
});

test("daemon launcher refuses to reuse a healthy daemon from another worktree", () => {
  const shouldReuse = shouldReuseDaemon(
    {
      executable: "uv",
      args: ["run", "python", "-m", "app.daemon.main"],
      cwd: "/tmp/current/backend",
      env: {},
      urls: {
        base: "http://127.0.0.1:43115",
        health: "http://127.0.0.1:43115/health",
      },
    },
    {
      mode: "local-daemon",
      baseUrl: "http://127.0.0.1:43115",
      healthUrl: "http://127.0.0.1:43115/health",
      workingDirectory: "/tmp/other/backend",
      clientId: null,
      allowBackgroundRunning: false,
    },
  );

  assert.equal(shouldReuse, false);
});
