import type { NotebookHistoryEntry } from "@/core/notebook";

type NotebookHistorySummary = {
  description: string;
  title: string;
};

export function summarizeNotebookHistoryEntry(
  entry: NotebookHistoryEntry,
): NotebookHistorySummary {
  if (entry.operation === "create") {
    return {
      title: "创建笔记",
      description: "首次保存内容",
    };
  }

  if (entry.operation === "restore") {
    return {
      title: "恢复到历史版本",
      description: entry.restored_from_version_id
        ? "从时间线恢复内容"
        : "恢复笔记内容",
    };
  }

  if (entry.operation === "rename") {
    return {
      title: "重命名笔记",
      description: "仅更新标题",
    };
  }

  if (entry.operation === "move") {
    return {
      title: "移动笔记",
      description: `移动到 ${entry.path_at_time}`,
    };
  }

  if (entry.operation === "delete") {
    return {
      title: "移入垃圾箱",
      description: "可从历史中恢复",
    };
  }

  const stats = summarizeDiffStats(entry.diff_text ?? "");
  if (stats.added > 0 || stats.removed > 0) {
    return {
      title: `新增 ${stats.added} 字，删除 ${stats.removed} 字`,
      description: "编辑内容",
    };
  }

  return {
    title: humanizeOperation(entry.operation),
    description: "更新内容",
  };
}

function humanizeOperation(operation: string) {
  switch (operation) {
    case "edit":
      return "编辑内容";
    case "rename":
      return "重命名笔记";
    case "move":
      return "移动笔记";
    case "delete":
      return "移入垃圾箱";
    default:
      return operation;
  }
}

function summarizeDiffStats(diffText: string) {
  let added = 0;
  let removed = 0;

  for (const line of diffText.split("\n")) {
    if (!line || line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) {
      continue;
    }
    if (line.startsWith("+")) {
      added += line.slice(1).length;
      continue;
    }
    if (line.startsWith("-")) {
      removed += line.slice(1).length;
    }
  }

  return { added, removed };
}
