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
