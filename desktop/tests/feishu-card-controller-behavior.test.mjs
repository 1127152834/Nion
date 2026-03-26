import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;

async function loadControllerFactory() {
  const source = await readFile(
    new URL("../src/main/bridge/feishu/card-controller.ts", import.meta.url),
    "utf8",
  );
  const stripped = stripTypeScriptTypes(
    source.replace(
      /export function createFeishuCardStreamController/,
      "function createFeishuCardStreamController",
    ),
  );
  return new Function(`${stripped}\nreturn createFeishuCardStreamController;`)();
}

test("feishu card controller create/update/finalize cycle works", async () => {
  const createFeishuCardStreamController = await loadControllerFactory();
  const controller = createFeishuCardStreamController({
    throttleMs: 10,
    footer: { status: true, elapsed: true },
  });

  const messageId = await controller.create("chat-1", "hello");
  assert.match(messageId, /^chat-1:/);

  const updateResult = await controller.update(messageId, "world");
  assert.equal(updateResult, "ok");

  await controller.finalize(messageId, "done", "completed");
});

test("feishu card controller returns fail for missing card", async () => {
  const createFeishuCardStreamController = await loadControllerFactory();
  const controller = createFeishuCardStreamController({
    throttleMs: 10,
  });

  const updateResult = await controller.update("missing", "world");
  assert.equal(updateResult, "fail");
});
