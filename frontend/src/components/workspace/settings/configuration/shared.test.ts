import assert from "node:assert/strict";
import test from "node:test";

const { asOptionalNumber, toInputValue } = await import(
  new URL("./shared.ts", import.meta.url).href,
);

void test("toInputValue preserves numeric config values for controlled inputs", () => {
  assert.equal(toInputValue(20480), "20480");
  assert.equal(toInputValue(0.7), "0.7");
  assert.equal(toInputValue("12"), "12");
  assert.equal(toInputValue(undefined), "");
});

void test("asOptionalNumber reads numeric config values without dropping numbers", () => {
  assert.equal(asOptionalNumber(20480), 20480);
  assert.equal(asOptionalNumber("0.7"), 0.7);
  assert.equal(asOptionalNumber(""), undefined);
  assert.equal(asOptionalNumber("NaN"), undefined);
});
