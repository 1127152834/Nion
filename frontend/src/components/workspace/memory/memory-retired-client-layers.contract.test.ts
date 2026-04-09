import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const RETIRED_FILES = [
  "../../../core/soul/api.ts",
  "../../../core/soul/hooks.ts",
  "../../../core/soul/types.ts",
  "../../../core/soul/presentation.ts",
  "../../../core/soul/ui-state.ts",
  "../../../core/soul-console/api.ts",
  "../../../core/soul-console/hooks.ts",
  "../../../core/soul-console/types.ts",
  "../../../core/memory-growth/api.ts",
  "../../../core/memory-growth/hooks.ts",
  "../../../core/memory-growth/types.ts",
  "../../../core/memory-growth/presentation.ts",
  "../../../core/memory-growth-v2/api.ts",
  "../../../core/memory-growth-v2/hooks.ts",
  "../../../core/memory-growth-v2/types.ts",
] as const;

void test("retired soul and growth client layers are physically deleted", async () => {
  await Promise.all(
    RETIRED_FILES.map(async (relativePath) => {
      await assert.rejects(access(new URL(relativePath, import.meta.url)));
    }),
  );
});

void test("active memory and soul surfaces no longer import retired client namespaces", async () => {
  const activeSources = await Promise.all([
    readFile(new URL("./memory-home-page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../settings/soul-settings-page.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  for (const source of activeSources) {
    assert.doesNotMatch(source, /core\/soul(?!-settings)/);
    assert.doesNotMatch(source, /core\/soul-console/);
    assert.doesNotMatch(source, /core\/memory-growth/);
  }
});
