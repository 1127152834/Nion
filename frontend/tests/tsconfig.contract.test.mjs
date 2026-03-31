import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("frontend tsconfig excludes unstable .next/dev/types from repository typecheck", () => {
  const source = fs.readFileSync(
    new URL("../tsconfig.json", import.meta.url),
    "utf8",
  );

  assert.match(source, /"\.next\/types\/\*\*\/\*\.ts"/);
  assert.doesNotMatch(source, /"\.next\/dev\/types\/\*\*\/\*\.ts"/);
});
