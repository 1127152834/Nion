import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("make help documents explicit web and desktop surface commands", () => {
  const source = fs.readFileSync(new URL("../../Makefile", import.meta.url), "utf8");

  assert.match(source, /web-dev/);
  assert.match(source, /web-start/);
});
