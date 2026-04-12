import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("fetchRuntimeProfile waits for desktop runtime info before requesting the runtime profile", async () => {
  const source = await readFile(new URL("./profile.ts", import.meta.url), "utf8");

  assert.match(source, /RUNTIME_PROFILE_FETCH_RETRY_DELAYS_MS = \[150, 350, 700, 1200, 1800, 2400\]/);
  assert.match(source, /const runtimeInfoLoader = desktopWindow\.nionDesktop\?\.getRuntimeInfo/);
  assert.match(source, /const runtimeInfo = await runtimeInfoLoader\(\)/);
  assert.match(source, /const baseUrl = runtimeInfo\?\.baseUrl\?\.trim\(\)/);
  assert.match(source, /return baseUrl;/);
  assert.match(source, /return await fetchRuntimeProfileOnce\(threadId\)/);
});
