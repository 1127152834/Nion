import type {
  SoulEventsResponse,
  SoulProposalResponse,
  SoulSummaryResponse,
} from "./types";
import { loadSoulSettings } from "../soul-console/api";
import type { MemoryGrowthItem } from "../memory-growth/types";

function toLegacySoulItem(
  memoryId: string,
  subtype: string,
  summary: string,
): MemoryGrowthItem {
  return {
    memory_id: memoryId,
    domain: "soul_settings",
    subtype,
    status: "active",
    title: null,
    summary,
  };
}

export async function loadSoulSummary(): Promise<SoulSummaryResponse> {
  const settings = await loadSoulSettings();

  return {
    current_soul:
      settings.has_active_overlay && settings.adaptive_overlay_summary
        ? toLegacySoulItem(
            "soul_settings_adaptive_overlay",
            "adaptive_overlay",
            settings.adaptive_overlay_summary,
          )
      : null,
    core_soul: toLegacySoulItem(
      "soul_settings_core_identity",
      "core_identity",
      settings.core_identity,
    ),
    staged_identity_narrative: toLegacySoulItem(
      "soul_settings_speech_style",
      "speech_style",
      settings.speech_style,
    ),
    summary: {
      baseline: settings.core_identity,
      relationship: settings.relationship_stance,
      current:
        settings.adaptive_overlay_summary ??
        settings.speech_style ??
        settings.core_identity,
    },
  };
}

export async function loadSoulProposals(): Promise<SoulProposalResponse> {
  return { proposals: [] };
}

export async function loadSoulEvents(): Promise<SoulEventsResponse> {
  return { events: [] };
}

export async function acceptSoulProposal(memoryId: string) {
  void memoryId;
  throw new Error("Soul proposals have been retired from the product surface.");
}

export async function rejectSoulProposal(memoryId: string) {
  void memoryId;
  throw new Error("Soul proposals have been retired from the product surface.");
}
