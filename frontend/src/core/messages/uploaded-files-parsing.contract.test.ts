import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("uploaded files parser still parses listed files even when the block contains the new-files empty marker", async () => {
  const source = await readFile(new URL("./utils.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /uploadedFilesContent\?\.includes\("\(empty\)"\)/);
  assert.match(source, /while \(\(fileMatch = fileRegex\.exec\(uploadedFilesContent \?\? ""\)\) !== null\)/);
});
