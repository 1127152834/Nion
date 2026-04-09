export interface MemoryFact {
  id: string;
  content: string;
  category: string;
  confidence: number;
  createdAt: string;
  source: string;
}

export interface MemoryUserFacingItem {
  id: string;
  content: string;
  source_label: string;
  updated_at: string;
  reason: string;
  related_refs: string[];
}

export interface MemoryUserFacing {
  user_profile: MemoryUserFacingItem[];
  long_term_background: MemoryUserFacingItem[];
  fact_memories: MemoryUserFacingItem[];
}

export interface MemoryFactInput {
  content: string;
  category: string;
  confidence: number;
}

export interface MemoryFactPatchInput {
  content?: string;
  category?: string;
  confidence?: number;
}

export interface UserMemory {
  version: string;
  lastUpdated: string;
  user: {
    workContext: {
      summary: string;
      updatedAt: string;
    };
    personalContext: {
      summary: string;
      updatedAt: string;
    };
    topOfMind: {
      summary: string;
      updatedAt: string;
    };
  };
  history: {
    recentMonths: {
      summary: string;
      updatedAt: string;
    };
    earlierContext: {
      summary: string;
      updatedAt: string;
    };
    longTermBackground: {
      summary: string;
      updatedAt: string;
    };
  };
  facts: MemoryFact[];
}
