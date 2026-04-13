import assert from "node:assert/strict";
import test from "node:test";

type InternalSummaryStateModule = {
  toggleInternalSummaryOpen: (openSummaryIds: ReadonlySet<string>, summaryId: string) => Set<string>;
  getInternalSummaryItemId: (args: {
    groupId?: string;
    messageId?: string;
    index: number;
  }) => string;
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

void test("getInternalSummaryItemId gives different fallback ids to different summaries without ids", async () => {
  const { getInternalSummaryItemId } = await loadInternalSummaryStateModule();

  const first = getInternalSummaryItemId({ index: 0 });
  const second = getInternalSummaryItemId({ index: 1 });

  assert.equal(first, "internal-summary-0");
  assert.equal(second, "internal-summary-1");
  assert.notEqual(first, second);
});

void test("getInternalSummaryItemId prefers group id then message id before index fallback", async () => {
  const { getInternalSummaryItemId } = await loadInternalSummaryStateModule();

  assert.equal(
    getInternalSummaryItemId({
      groupId: "group-1",
      messageId: "message-1",
      index: 3,
    }),
    "group-1",
  );
  assert.equal(
    getInternalSummaryItemId({
      messageId: "message-2",
      index: 4,
    }),
    "message-2",
  );
});
