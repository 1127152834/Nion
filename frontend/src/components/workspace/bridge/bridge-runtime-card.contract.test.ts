import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge runtime warnings use inline icon banners with richer warning presentation", async () => {
  const source = await readFile(new URL("./bridge-shared.tsx", import.meta.url), "utf8");

  assert.match(source, /icon=\{<Warning className="size-4" \/>\}/);
  assert.match(source, /description=\{t\("bridge\.enableRequiresVerification"\)\}/);
  assert.match(source, /rounded-xl border px-3\.5 py-3/);
  assert.match(source, /text-\[13px\] leading-5 font-semibold text-current/);
});
