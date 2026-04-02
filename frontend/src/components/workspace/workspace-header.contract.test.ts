import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace header applies desktop-only top-left spacing refinement", async () => {
  const source = await readFile(
    new URL("./workspace-header.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useIsDesktopShell/);
  assert.match(source, /isDesktopShell && "min-h-\[4\.75rem\] px-4 pt-7 pb-3"/);
  assert.match(source, /isDesktopShell && "w-full items-end justify-between pl-2 pr-0"/);
  assert.match(source, /isDesktopShell && "text-\[1\.625rem\] tracking-\[0\.04em\]"/);
  assert.match(source, /isDesktopShell[\s\S]*\? "leading-none"/);
  assert.match(source, /isDesktopShell[\s\S]*"size-6 border-sidebar-border\/50/);
  assert.match(source, /bg-sidebar-accent\/20 text-sidebar-foreground\/70/);
});
