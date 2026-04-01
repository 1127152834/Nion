import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNotebookDirectoryMentionOptions,
  buildObjectImplicitMentions,
} from "./object-mentions.ts";

void test("buildNotebookDirectoryMentionOptions converts notebook directories into object mention options", () => {
  const result = buildNotebookDirectoryMentionOptions([
    {
      path: "articles",
      label: "articles",
      depth: 1,
      isInbox: false,
      pathLabel: "articles",
    },
    {
      path: "meetings/weekly",
      label: "weekly",
      depth: 2,
      isInbox: false,
      pathLabel: "meetings / weekly",
    },
  ]);

  assert.deepEqual(
    result.map((item) => item.value),
    ["articles", "meetings/weekly"],
  );
  assert.equal(result[0]?.objectKind, "notebook-directory");
});

void test("buildObjectImplicitMentions appends object mentions that are not already in text", () => {
  const result = buildObjectImplicitMentions({
    text: "将链接文章存到 @articles",
    mentions: [
      {
        kind: "object",
        objectKind: "notebook-directory",
        value: "articles",
        mention: "@articles",
        label: "articles",
      },
      {
        kind: "object",
        objectKind: "notebook-directory",
        value: "meetings/weekly",
        mention: "@meetings/weekly",
        label: "weekly",
      },
    ],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.value, "meetings/weekly");
});

void test("buildObjectImplicitMentions deduplicates duplicate object mentions", () => {
  const duplicate = {
    kind: "object" as const,
    objectKind: "notebook-directory" as const,
    value: "articles",
    mention: "@articles",
    label: "articles",
  };

  const result = buildObjectImplicitMentions({
    text: "请保存到笔记",
    mentions: [duplicate, duplicate],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.value, "articles");
});
