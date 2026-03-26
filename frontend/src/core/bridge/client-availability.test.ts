import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge client exposes an optional lookup helper for non-desktop environments", async () => {
  const source = await readFile(new URL("./client.ts", import.meta.url), "utf8");

  assert.match(source, /export function getBridgeClient\(\): BridgeClient \| null/);
  assert.match(source, /return null;/);
});

void test("bridge section handles missing bridge client without throwing", async () => {
  const source = await readFile(
    new URL("../../components/workspace/bridge/BridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const client = getBridgeClient\(\);/);
  assert.match(source, /if \(!client\)/);
  assert.match(source, /t\.bridge\.desktopOnly/);
});
