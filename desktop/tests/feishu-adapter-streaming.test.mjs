import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("feishu adapter exposes a card stream controller hook", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/adapters/feishu-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /createFeishuCardStreamController/);
  assert.match(source, /getCardStreamController/);
});
