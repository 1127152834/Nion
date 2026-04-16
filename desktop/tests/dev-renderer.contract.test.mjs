import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

test("desktop main can load a dev renderer URL", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /NION_DESKTOP_RENDERER_URL/);
});

test("desktop package exposes dedicated renderer and main dev scripts", () => {
  const source = fs.readFileSync(
    new URL("../package.json", import.meta.url),
    "utf8",
  );

  assert.match(source, /"dev:renderer"/);
  assert.match(source, /"dev:main"/);
  assert.match(source, /"dev:electron"/);
});

test("desktop dev launcher force-stops an occupied renderer port before restart", () => {
  const source = fs.readFileSync(
    new URL("../../scripts/desktop-dev.sh", import.meta.url),
    "utf8",
  );

  assert.match(source, /lsof -tiTCP:5173/);
  assert.match(source, /kill -9/);
  assert.match(source, /Stopping existing Vite renderer/);
});

test("desktop dev launcher also clears stale electron and daemon processes", () => {
  const source = fs.readFileSync(
    new URL("../../scripts/desktop-dev.sh", import.meta.url),
    "utf8",
  );

  assert.match(source, /pkill -f "electron dist\/main\/index\.js"/);
  assert.match(source, /lsof -tiTCP:43115/);
  assert.match(source, /Stopping existing desktop Electron process/);
  assert.match(source, /Stopping existing local daemon on port 43115/);
});

test("desktop vite config resolves React aliases from desktop node_modules", () => {
  const source = fs.readFileSync(
    new URL("../vite.config.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const desktopNodeModules = path\.resolve\(import\.meta\.dirname, "node_modules"\);/);
  assert.match(source, /path\.resolve\(desktopNodeModules, "react\/jsx-dev-runtime\.js"\)/);
  assert.doesNotMatch(source, /const rootNodeModules = path\.resolve\(rootDir, "node_modules"\);/);
});

test("desktop dev launcher routes pnpm calls through the shared resolver script", () => {
  const source = fs.readFileSync(
    new URL("../../scripts/desktop-dev.sh", import.meta.url),
    "utf8",
  );

  assert.match(source, /PNPM_BIN="\$REPO_ROOT\/scripts\/pnpm\.sh"/);
  assert.doesNotMatch(source, /\npnpm --dir desktop /);
});

test("shared pnpm resolver falls back to corepack and explains missing prerequisites", () => {
  const source = fs.readFileSync(
    new URL("../../scripts/pnpm.sh", import.meta.url),
    "utf8",
  );

  assert.match(source, /command -v pnpm/);
  assert.match(source, /command -v corepack/);
  assert.match(source, /exec corepack pnpm "\$@"/);
  assert.match(source, /Node\.js 22\+/);
});

test("shared pnpm resolver can recover from a stripped PATH on macOS-style installs", () => {
  const result = spawnSync(fileURLToPath(new URL("../../scripts/pnpm.sh", import.meta.url)), ["-v"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    env: {
      ...process.env,
      PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /^\d+\.\d+\.\d+\s*$/);
});
