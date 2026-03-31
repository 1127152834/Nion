import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop index CSP allows blob workers and vite dev assets", () => {
  const source = fs.readFileSync(
    new URL("../index.html", import.meta.url),
    "utf8",
  );

  assert.match(source, /worker-src 'self' blob:/);
  assert.match(source, /script-src 'self' 'unsafe-eval' blob: http:\/\/127\.0\.0\.1:5173/);
  assert.match(source, /connect-src[\s\S]*http:\/\/127\.0\.0\.1:5173/);
  assert.match(source, /ws:\/\/127\.0\.0\.1:5173/);
});
