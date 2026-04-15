import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("html artifact preview uses blob URL iframe source instead of raw srcDoc injection", async () => {
  const source = await readFile(new URL("./artifact-file-detail.tsx", import.meta.url), "utf8");

  assert.match(source, /const \[htmlPreviewUrl, setHtmlPreviewUrl\] = useState<string>\(\);/);
  assert.match(source, /const blob = new Blob\(\[content \?\? ""\], \{ type: "text\/html" \}\);/);
  assert.match(source, /const url = URL\.createObjectURL\(blob\);/);
  assert.match(source, /URL\.revokeObjectURL\(url\);/);
  assert.match(source, /src=\{htmlPreviewUrl\}/);
  assert.doesNotMatch(source, /srcDoc=\{content\}/);
});
