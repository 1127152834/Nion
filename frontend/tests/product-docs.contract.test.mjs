import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop product contract describes a multi-surface product", () => {
  const source = fs.readFileSync(
    new URL("../../docs/desktop/desktop-product-contract.md", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /desktop-only product/i);
  assert.match(source, /two first-party surfaces/i);
});
