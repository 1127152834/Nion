import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("guardian runtime hook owns refresh triggers and shared runtime merge flow", async () => {
  const source = await readFile(
    new URL("./use-guardian-runtime.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export function useGuardianRuntime\(\)/);
  assert.match(source, /createGuardianRuntimeSnapshot\("loading"\)/);
  assert.match(source, /const refresh = useCallback\(async \(\) => \{/);
  assert.match(source, /const desktopRuntime = await getDesktopRuntimeInfo\(\)/);
  assert.match(source, /getBridgeClient\(\)\?\.getRuntimeInfo\(\)/);
  assert.match(source, /let bridgeRuntimeError = false/);
  assert.match(source, /resolveGuardianRuntimeSnapshot\(\{/);
  assert.match(source, /window\.addEventListener\("focus", handleWindowFocus\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(source, /if \(document\.visibilityState === "visible"\)/);
  assert.match(source, /void refresh\(\)/);
  assert.match(source, /return \{ snapshot, refresh \};/);
  assert.doesNotMatch(source, /\.catch\(\(\) => null\)/);
  assert.doesNotMatch(source, /setInterval\(/);
  assert.doesNotMatch(source, /setTimeout\(/);
});
