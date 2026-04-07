import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("root makefile exposes builder and forge packaging commands", () => {
  const makefile = fs.readFileSync(new URL("../../Makefile", import.meta.url), "utf8");
  assert.match(makefile, /package-desktop-builder/);
  assert.match(makefile, /package-desktop-forge/);
  assert.match(makefile, /desktop-install/);
  assert.match(makefile, /PNPM := \.\/scripts\/pnpm\.sh/);
});

test("top-level dev launchers use the shared pnpm resolver", () => {
  const serveScript = fs.readFileSync(new URL("../../scripts/serve.sh", import.meta.url), "utf8");
  const daemonScript = fs.readFileSync(
    new URL("../../scripts/start-daemon.sh", import.meta.url),
    "utf8",
  );

  assert.match(serveScript, /PNPM_BIN="\$REPO_ROOT\/scripts\/pnpm\.sh"/);
  assert.match(serveScript, /FRONTEND_CMD="\$PNPM_BIN run dev"/);
  assert.match(daemonScript, /"\$1\/scripts\/pnpm\.sh" run dev/);
});
