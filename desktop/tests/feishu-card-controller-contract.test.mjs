import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop feishu card controller contract exists", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/feishu/card-controller.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export type FeishuCardStreamConfig/);
  assert.match(source, /export function createFeishuCardStreamController/);
  assert.match(source, /create: async/);
  assert.match(source, /update: async/);
  assert.match(source, /finalize: async/);
});
