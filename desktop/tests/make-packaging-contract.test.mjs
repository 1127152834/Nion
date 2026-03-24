import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("root makefile exposes builder and forge packaging commands", () => {
  const makefile = fs.readFileSync(new URL("../../Makefile", import.meta.url), "utf8");
  assert.match(makefile, /package-desktop-builder/);
  assert.match(makefile, /package-desktop-forge/);
  assert.match(makefile, /desktop-install/);
});
