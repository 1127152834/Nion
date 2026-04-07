import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("Weixin risk warning keeps the icon and copy in a single inline row", async () => {
  const source = await readFile(new URL("./WeixinBridgeSection.tsx", import.meta.url), "utf8");

  assert.match(source, /<StatusBanner variant="warning" className="text-sm">\s*<div className="flex items-start gap-2">/s);
  assert.match(source, /<Warning className="mt-0\.5 size-4 shrink-0" \/>/);
  assert.match(source, /<span className="min-w-0">\{t\("weixin\.riskWarning"\)\}<\/span>/);
});
