import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;
const requireFn = nodeModule.createRequire(import.meta.url);

async function loadStoreFactory() {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/weixin-store.ts", import.meta.url),
    "utf8",
  );
  const transformed = stripTypeScriptTypes(
    source
      .replace(/^import[\s\S]*?;\n/gm, "")
      .replace(/export function createWeixinBridgeStore/, "function createWeixinBridgeStore"),
  );

  return new Function(
    "fs",
    "path",
    `${transformed}\nreturn createWeixinBridgeStore;`,
  )(fs, path);
}

test("weixin bridge store persists accounts and context tokens", async () => {
  const createWeixinBridgeStore = await loadStoreFactory();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nion-weixin-store-"));
  const store = createWeixinBridgeStore(path.join(tempDir, "weixin.json"));

  const account = store.upsertAccount({
    accountId: "wx-account-1",
    userId: "user-1",
    baseUrl: "https://ilinkai.weixin.qq.com",
    cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
    token: "token-1",
    enabled: true,
  });

  assert.equal(store.listAccounts().length, 1);
  assert.equal(account.accountId, "wx-account-1");

  store.upsertContextToken("wx-account-1", "peer-1", "ctx-1");
  assert.equal(store.getContextToken("wx-account-1", "peer-1"), "ctx-1");

  store.setAccountEnabled("wx-account-1", false);
  assert.equal(store.getAccount("wx-account-1")?.enabled, false);
});
