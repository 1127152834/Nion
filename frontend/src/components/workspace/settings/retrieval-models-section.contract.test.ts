import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("retrieval models section stays minimal and only projects active embedding model", async () => {
  const source = await readFile(
    new URL("./retrieval-models-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /检索模型|Retrieval/);
  assert.match(source, /正在读取检索模型状态|Loading retrieval model status/);
  assert.match(source, /status\.active_profile\.embedding\.model_name/);
  assert.doesNotMatch(source, /推荐组合|Recommended stack/);
  assert.doesNotMatch(source, /consumer|Consumer/);
});
