import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { shouldAutoStartDesktopMain } from "../dist/main/entrypoint.js";

test("auto-start accepts relative entry arguments resolved against cwd", () => {
  const originalCwd = process.cwd();
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nion-desktop-entrypoint-"));
  fs.mkdirSync(path.join(fixtureRoot, "dist/main"), { recursive: true });
  fs.writeFileSync(path.join(fixtureRoot, "dist/main/index.js"), "", "utf8");
  process.chdir(fixtureRoot);

  try {
    assert.equal(
      shouldAutoStartDesktopMain(path.join(fixtureRoot, "dist/main/index.js"), "dist/main/index.js"),
      true,
    );
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("auto-start rejects unrelated entry arguments", () => {
  assert.equal(
    shouldAutoStartDesktopMain("/tmp/project/dist/main/index.js", "/tmp/project/dist/main/other.js"),
    false,
  );
});
