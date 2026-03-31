import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop workspace defines builder and forge packaging scripts", () => {
  const pkg = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.ok(pkg.scripts["package:builder"]);
  assert.ok(pkg.scripts["package:forge"]);
  assert.ok(pkg.scripts["build:helper"]);
});

test("desktop renderer wires the project workspace routes", () => {
  const source = fs.readFileSync(
    new URL("../src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /path="\/workspace\/projects"/);
  assert.match(source, /path="\/workspace\/projects\/:project_id"/);
  assert.match(source, /path="\/workspace\/projects\/:project_id\/threads\/:thread_id"/);
});

test("desktop renderer wires notebook memory and self-maintenance workspace routes", () => {
  const source = fs.readFileSync(
    new URL("../src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /path="\/workspace\/notebook"/);
  assert.match(source, /path="\/workspace\/notebook\/trash"/);
  assert.match(source, /path="\/workspace\/memory"/);
  assert.match(source, /path="\/workspace\/self-maintenance"/);
});
