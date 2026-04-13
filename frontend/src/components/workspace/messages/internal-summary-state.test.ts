import assert from "node:assert/strict";
import test from "node:test";

type InternalSummaryStateModule = {
  toggleInternalSummaryOpen: (openSummaryIds: ReadonlySet<string>, summaryId: string) => Set<string>;
};

const loadInternalSummaryStateModule = async (): Promise<InternalSummaryStateModule> => {
  return Function("modulePath", "return import(modulePath);")(
    "./internal-summary-state.ts",
  ) as Promise<InternalSummaryStateModule>;
};

void test("toggleInternalSummaryOpen opens then closes the same summary id", async () => {
  let stateModule: InternalSummaryStateModule;

  try {
    stateModule = await loadInternalSummaryStateModule();
  } catch (error) {
    assert.fail(
      `Missing internal summary state helper module: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const { toggleInternalSummaryOpen } = stateModule;
  const opened = toggleInternalSummaryOpen(new Set<string>(), "summary-1");
  assert.deepEqual([...opened], ["summary-1"]);

  const closed = toggleInternalSummaryOpen(opened, "summary-1");
  assert.deepEqual([...closed], []);
});

void test("toggleInternalSummaryOpen returns a new set without mutating the current state", async () => {
  const { toggleInternalSummaryOpen } = await loadInternalSummaryStateModule();
  const current = new Set<string>(["summary-1"]);

  const next = toggleInternalSummaryOpen(current, "summary-2");

  assert.deepEqual([...current], ["summary-1"]);
  assert.deepEqual([...next], ["summary-1", "summary-2"]);
  assert.notEqual(next, current);
});
