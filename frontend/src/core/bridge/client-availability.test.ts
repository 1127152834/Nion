import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge client exposes an optional lookup helper for non-desktop environments", async () => {
  const source = await readFile(new URL("./client.ts", import.meta.url), "utf8");

  assert.match(source, /export function getBridgeClient\(\): BridgeClient \| null/);
  assert.match(source, /return null;/);
});

void test("bridge section handles missing bridge client without throwing", async () => {
  const layoutSource = await readFile(
    new URL("../../components/workspace/bridge/BridgeLayout.tsx", import.meta.url),
    "utf8",
  );
  const telegramSource = await readFile(
    new URL("../../components/workspace/bridge/TelegramBridgeSection.tsx", import.meta.url),
    "utf8",
  );
  const sharedSource = await readFile(
    new URL("../../components/workspace/bridge/bridge-shared.tsx", import.meta.url),
    "utf8",
  );

  assert.match(layoutSource, /<TelegramBridgeSection \/>/);
  assert.doesNotMatch(telegramSource, /if \(!client\) \{\s*return null;\s*\}/);
  assert.match(sharedSource, /"bridge\.desktopOnly":/);
});
