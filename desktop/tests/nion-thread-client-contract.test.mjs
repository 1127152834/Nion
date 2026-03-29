import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop nion thread client contract exists", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/nion-thread-client.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export function createNionThreadClient/);
  assert.match(source, /searchThread/);
  assert.match(source, /ensureThreadState/);
  assert.match(source, /streamMessage/);
  assert.match(source, /uploadFiles/);
  assert.match(source, /resolvePermission/);
  assert.match(source, /X-Nion-Client-Id/);
});
