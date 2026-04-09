export interface MemoryCanonicalContextSection {
  summary: string;
  updatedAt: string;
}

export interface MemoryUserSurface {
  workContext: MemoryCanonicalContextSection;
  personalContext: MemoryCanonicalContextSection;
  topOfMind: MemoryCanonicalContextSection;
}

export interface MemoryHistorySurface {
  recentMonths: MemoryCanonicalContextSection;
  earlierContext: MemoryCanonicalContextSection;
  longTermBackground: MemoryCanonicalContextSection;
}

export interface MemoryFactsSurfaceFact {
  id: string;
  content: string;
  category: string;
  confidence: number;
  createdAt: string;
  source: string;
}

export interface MemoryFactsSurface {
  lastUpdated: string;
  facts: MemoryFactsSurfaceFact[];
}
