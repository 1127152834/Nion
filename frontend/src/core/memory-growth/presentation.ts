import type { MemoryGrowthItem } from "./types";

export type MemoryGrowthAction = "accept" | "freeze" | "resume" | "reject";

export function describeMemoryGrowthStatus(status: string) {
  switch (status) {
    case "candidate":
      return { label: "候选中", variant: "secondary" as const };
    case "active":
      return { label: "已生效", variant: "default" as const };
    case "archived":
      return { label: "已冻结", variant: "outline" as const };
    case "invalidated":
      return { label: "已拒绝", variant: "destructive" as const };
    default:
      return { label: status || "未知状态", variant: "outline" as const };
  }
}

export function describeMemoryGrowthDomain(domain: string) {
  switch (domain) {
    case "learning":
      return {
        label: "学习主题",
        explanation: "当同类问题反复出现时，系统会把它提升为长期学习主题。",
      };
    case "procedure":
      return {
        label: "方法草案",
        explanation: "这是从重复工作方式中抽出的流程草案，确认后才会沉淀为稳定做法。",
      };
    case "soul":
      return {
        label: "灵魂提案",
        explanation: "这是对助手长期风格与服务方式的提案，用来塑造陪伴感与稳定性。",
      };
    default:
      return {
        label: domain || "未知类型",
        explanation: "当前条目已进入治理面，但还没有更具体的产品说明。",
      };
  }
}

export function listMemoryGrowthActions(
  item: Pick<MemoryGrowthItem, "domain" | "status">,
): MemoryGrowthAction[] {
  if (item.domain === "learning") {
    switch (item.status) {
      case "candidate":
        return ["accept", "reject"];
      case "active":
        return ["freeze", "reject"];
      case "archived":
        return ["resume"];
      default:
        return [];
    }
  }

  if (item.domain === "procedure" || item.domain === "soul") {
    if (item.status === "candidate") {
      return ["accept", "reject"];
    }
    return [];
  }

  switch (item.status) {
    case "candidate":
      return ["accept", "reject"];
    case "active":
      return ["freeze", "reject"];
    case "archived":
      return ["resume"];
    default:
      return [];
  }
}
