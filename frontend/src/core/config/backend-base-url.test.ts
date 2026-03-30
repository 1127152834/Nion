import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("desktop runtime backend URL is resolved before compiled env overrides", async () => {
  const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");

  const desktopRuntimeIndex = source.indexOf("const desktopRuntimeUrl = getDesktopRuntimeBackendBaseURL();");
  const envIndex = source.indexOf("} else if (env.NEXT_PUBLIC_BACKEND_BASE_URL) {");

  assert.notEqual(desktopRuntimeIndex, -1);
  assert.notEqual(envIndex, -1);
  assert.ok(
    desktopRuntimeIndex < envIndex,
    "desktop runtime URL should be checked before NEXT_PUBLIC_BACKEND_BASE_URL",
  );
});

void test("desktop shell falls back to the local daemon helper port", async () => {
  const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");

  assert.match(source, /if \(typeof window\.nionDesktop !== "undefined"\) \{/);
  assert.match(source, /return "http:\/\/127\.0\.0\.1:43115";/);
});

void test("plain web localhost still keeps the gateway fallback", async () => {
  const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");

  assert.match(source, /return "http:\/\/localhost:8001";/);
});
