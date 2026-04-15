import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("opening provider models also switches the outer settings tab to models", async () => {
  const source = await readFile(
    new URL("./configuration/sections/models-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /setProviderDetailView\("models"\);[\s\S]*onViewChange\?\.\("models"\);[\s\S]*\{copy\.openProviderModels\}/,
  );
});

void test("leaving provider models returns the outer settings tab to providers", async () => {
  const source = await readFile(
    new URL("./configuration/sections/models-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /setProviderDetailView\("details"\);[\s\S]*onViewChange\?\.\("providers"\);[\s\S]*\{copy\.backToProviderDetail\}/,
  );
});

void test("model settings page exposes retrieval as a child view tab", async () => {
  const source = await readFile(
    new URL("./model-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ModelSettingsChildView>\("providers"\)/);
  assert.match(source, /id:\s*"retrieval"/);
  assert.match(source, /label:\s*isZh \? "检索模型" : "Retrieval"/);
  assert.match(source, /subtitle:\s*isZh \? "向量与重排序" : "Embedding and rerank"/);
});
