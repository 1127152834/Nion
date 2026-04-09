import type {
  SoulEventsResponse,
  SoulProposalResponse,
  SoulSummaryResponse,
} from "./types";
import { loadSoulSettings } from "../soul-console/api.ts";

export async function loadSoulSummary(): Promise<SoulSummaryResponse> {
  const settings = await loadSoulSettings();
  return {
    current_soul: settings.has_active_overlay
      ? {
          memory_id: "soul_overlay_active_main",
          domain: "soul",
          subtype: "adaptive_overlay",
          status: "active",
          title: "临时表达模式",
          summary: settings.adaptive_overlay_summary ?? "当前没有启用临时表达模式。",
        }
      : null,
    core_soul: {
      memory_id: "soul_core_main",
      domain: "soul",
      subtype: "core",
      status: "active",
      title: "核心人格",
      summary: settings.core_identity,
    },
    staged_identity_narrative: settings.speech_style
      ? {
          memory_id: "soul_settings_speech_style",
          domain: "soul",
          subtype: "identity_narrative",
          status: "active",
          title: "说话方式",
          summary: settings.speech_style,
        }
      : null,
    summary: {
      baseline: settings.values_and_boundaries,
      relationship: settings.relationship_stance,
      current: settings.adaptive_overlay_summary ?? settings.speech_style,
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
  throw new Error("Soul proposal actions are retired from the product client.");
}

export async function rejectSoulProposal(memoryId: string) {
  void memoryId;
  throw new Error("Soul proposal actions are retired from the product client.");
}
