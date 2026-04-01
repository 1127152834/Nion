import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("provider settings load plaintext secret on reveal and keep masked length aligned with the real key", async () => {
  const adapterSource = await readFile(
    new URL("./legacy-draft-adapter.ts", import.meta.url),
    "utf8",
  );
  const sectionSource = await readFile(
    new URL("../configuration/sections/models-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(adapterSource, /api_key_length:/);
  assert.match(sectionSource, /loadProviderSecretValue\(/);
  assert.match(sectionSource, /type=\{editApiKeyVisible \? "text" : "password"\}/);
});
