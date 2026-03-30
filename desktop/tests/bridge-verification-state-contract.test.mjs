import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("desktop bridge main treats weixin verification as account-driven instead of persisted flag only", async () => {
  const source = await readFile(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /verifyWeixinAccounts/);
  assert.match(source, /verifyWeixinAccounts\(weixinBridgeStore\.listAccounts\(\)\)\.verified/);
});
