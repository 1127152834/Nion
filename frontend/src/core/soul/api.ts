import { getBackendBaseURL } from "../config/index.ts";

import type {
  SoulEventsResponse,
  SoulProposalResponse,
  SoulSummaryResponse,
} from "./types";

export async function loadSoulSummary(): Promise<SoulSummaryResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/growth/soul`);
  if (!response.ok) {
    throw new Error(`Failed to load soul summary (${response.status})`);
  }
  return (await response.json()) as SoulSummaryResponse;
}

export async function loadSoulProposals(): Promise<SoulProposalResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/growth/soul/proposals`);
  if (!response.ok) {
    throw new Error(`Failed to load soul proposals (${response.status})`);
  }
  return (await response.json()) as SoulProposalResponse;
}

export async function loadSoulEvents(): Promise<SoulEventsResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/growth/soul/events`);
  if (!response.ok) {
    throw new Error(`Failed to load soul events (${response.status})`);
  }
  return (await response.json()) as SoulEventsResponse;
}

export async function acceptSoulProposal(memoryId: string) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/growth/soul/proposals/${encodeURIComponent(memoryId)}/accept`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`Failed to accept soul proposal (${response.status})`);
  }
  return (await response.json()) as { memory_id: string; action: string };
}

export async function rejectSoulProposal(memoryId: string) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/growth/soul/proposals/${encodeURIComponent(memoryId)}/reject`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`Failed to reject soul proposal (${response.status})`);
  }
  return (await response.json()) as { memory_id: string; action: string };
}
