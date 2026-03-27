import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("api client reads from runtime-aware thread client entrypoint", () => {
  const source = fs.readFileSync(
    new URL("../src/core/api/api-client.ts", import.meta.url),
    "utf8",
  );

  assert.ok(source.includes('from "./thread-client"'));
});
