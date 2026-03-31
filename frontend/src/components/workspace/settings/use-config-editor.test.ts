import assert from "node:assert/strict";
import test from "node:test";

const { shouldAdoptConfigSnapshot } = await import(
  new URL("./use-config-editor.sync.ts", import.meta.url).href,
);

void test("config editor ignores snapshot refresh when version is unchanged", () => {
  assert.equal(
    shouldAdoptConfigSnapshot({
      currentVersion: "v1",
      nextVersion: "v1",
    }),
    false,
  );
});

void test("config editor adopts snapshot when version changes", () => {
  assert.equal(
    shouldAdoptConfigSnapshot({
      currentVersion: "v1",
      nextVersion: "v2",
    }),
    true,
  );
});
