import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop bridge validators expose sanitize and dangerous input guards", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/security/validators.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /validateWorkingDirectory/);
  assert.match(source, /isDangerousInput/);
  assert.match(source, /sanitizeInput/);
  assert.match(source, /DANGEROUS_PATTERNS/);
});
