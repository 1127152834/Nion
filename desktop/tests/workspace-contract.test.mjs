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
