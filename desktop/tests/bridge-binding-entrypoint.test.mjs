import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("bridge manager exposes a binding resolver entrypoint", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /resolveBindingForAddress/);
  assert.match(source, /router\.resolveBinding/);
});
