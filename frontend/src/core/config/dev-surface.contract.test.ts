import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("frontend dev defaults to webpack and allows localhost proxy origins", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
  ) as {
    scripts?: Record<string, string>;
  };
  const nextConfigSource = await readFile(
    new URL("../../../next.config.js", import.meta.url),
    "utf8",
  );

  assert.equal(packageJson.scripts?.dev, "next dev --webpack");
  assert.equal(packageJson.scripts?.["dev:turbo"], "next dev --turbo");
  assert.match(
    nextConfigSource,
    /allowedDevOrigins:\s*\[\s*"127\.0\.0\.1",\s*"localhost"\s*\]/,
  );
});
