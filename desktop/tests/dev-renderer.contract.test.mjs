import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

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
