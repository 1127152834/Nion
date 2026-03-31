import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const EXPECTED_RUNTIME_BASE_CALL = /getBackendBaseURL\(\)/;
const EXPECTED_THREAD_CLIENT_CALL = /createThreadClient\(\)|createDesktopThreadClient\(|getAPIClient\(/;

void test("desktop renderer thread-adjacent APIs consistently resolve through runtime-aware base URL helpers", async () => {
  const [
    inputBoxSource,
    uploadsApiSource,
    notebookAssistantApiSource,
    threadHooksSource,
  ] = await Promise.all([
    readFile(
      new URL("../components/workspace/input-box.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("./uploads/api.ts", import.meta.url), "utf8"),
    readFile(new URL("./notebook-assistant/api.ts", import.meta.url), "utf8"),
    readFile(new URL("./threads/hooks.ts", import.meta.url), "utf8"),
  ]);

  assert.match(
    inputBoxSource,
    /fetch\(`\$\{getBackendBaseURL\(\)\}\/api\/threads\/\$\{threadId\}\/suggestions`/,
  );
  assert.match(
    uploadsApiSource,
    /`\$\{getBackendBaseURL\(\)\}\/api\/threads\/\$\{threadId\}\/uploads`/,
  );
  assert.match(notebookAssistantApiSource, EXPECTED_THREAD_CLIENT_CALL);
  assert.match(threadHooksSource, /const apiClient = useMemo\(\(\) => getAPIClient\(isMock\), \[isMock\]\);/);
  assert.match(inputBoxSource, EXPECTED_RUNTIME_BASE_CALL);
  assert.match(uploadsApiSource, EXPECTED_RUNTIME_BASE_CALL);
});
