import {
  acceptMemoryGrowthItem,
  freezeMemoryGrowthItem,
  loadMemoryGrowth,
  rejectMemoryGrowthItem,
  resumeMemoryGrowthItem,
} from "@/core/memory-growth/api";

import type { MemoryGrowthResponseV2 } from "./types";

export async function loadMemoryGrowthV2(): Promise<MemoryGrowthResponseV2> {
  return loadMemoryGrowth();
}

export async function acceptMemoryGrowthItemV2(memoryId: string) {
  return acceptMemoryGrowthItem(memoryId);
}

export async function freezeMemoryGrowthItemV2(memoryId: string) {
  return freezeMemoryGrowthItem(memoryId);
}

export async function resumeMemoryGrowthItemV2(memoryId: string) {
  return resumeMemoryGrowthItem(memoryId);
}

export async function rejectMemoryGrowthItemV2(memoryId: string) {
  return rejectMemoryGrowthItem(memoryId);
}
