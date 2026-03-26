import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  DesktopBridgeIncidentRecord,
  DesktopBridgeIncidentSeverity,
  DesktopBridgeIncidentSource,
  DesktopBridgeIncidentStatus,
  DesktopBridgeIncidentType,
  DesktopBridgeRecommendedAction,
  DesktopBridgeExecutedAction,
} from "../../shared/bridge-ipc.js";

export type BridgeIncidentRecord = DesktopBridgeIncidentRecord;

export type BridgeIncidentInput = {
  source: DesktopBridgeIncidentSource;
  incidentType: DesktopBridgeIncidentType;
  severity: DesktopBridgeIncidentSeverity;
  status: DesktopBridgeIncidentStatus;
  adapterPlatform: string | null;
  bindingId: string | null;
  threadId: string | null;
  summary: string;
  userVisibleExplanation: string;
  rootCauseHypothesis: string | null;
  confidence: number | null;
  recommendedActions: DesktopBridgeRecommendedAction[];
  executedActions: DesktopBridgeExecutedAction[];
  evidence: Record<string, unknown>;
  resolutionNote: string | null;
};

type BridgeIncidentsDocument = {
  incidents: BridgeIncidentRecord[];
};

const DEFAULT_DOCUMENT: BridgeIncidentsDocument = {
  incidents: [],
};

export function createBridgeIncidentsStore(filePath: string) {
  const resolvedPath = path.resolve(filePath);

  const ensureParent = () => {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  };

  const readDocument = (): BridgeIncidentsDocument => {
    if (!fs.existsSync(resolvedPath)) {
      return { ...DEFAULT_DOCUMENT };
    }

    const raw = fs.readFileSync(resolvedPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<BridgeIncidentsDocument>;
    return {
      incidents: Array.isArray(parsed.incidents) ? [...parsed.incidents] : [],
    };
  };

  const writeDocument = (document: BridgeIncidentsDocument) => {
    ensureParent();
    fs.writeFileSync(resolvedPath, JSON.stringify(document, null, 2), "utf8");
  };

  const recordIncident = (input: BridgeIncidentInput): BridgeIncidentRecord => {
    const document = readDocument();
    const now = new Date().toISOString();
    const incident: BridgeIncidentRecord = {
      incidentId: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    document.incidents.push(incident);
    writeDocument(document);
    return incident;
  };

  const listIncidents = (filters: {
    status?: DesktopBridgeIncidentStatus;
    severity?: DesktopBridgeIncidentSeverity;
    adapterPlatform?: string;
    incidentType?: DesktopBridgeIncidentType;
    limit?: number;
  } = {}): BridgeIncidentRecord[] => {
    const incidents = readDocument().incidents
      .slice()
      .reverse()
      .filter((incident: BridgeIncidentRecord) => (filters.status ? incident.status === filters.status : true))
      .filter((incident: BridgeIncidentRecord) => (filters.severity ? incident.severity === filters.severity : true))
      .filter((incident: BridgeIncidentRecord) => (filters.adapterPlatform ? incident.adapterPlatform === filters.adapterPlatform : true))
      .filter((incident: BridgeIncidentRecord) => (filters.incidentType ? incident.incidentType === filters.incidentType : true));

    if (typeof filters.limit === "number") {
      return incidents.slice(0, filters.limit);
    }
    return incidents;
  };

  const getIncident = (incidentId: string): BridgeIncidentRecord | null => {
    return readDocument().incidents.find((incident) => incident.incidentId === incidentId) ?? null;
  };

  const dismissIncident = (incidentId: string): BridgeIncidentRecord | null => {
    const document = readDocument();
    const index = document.incidents.findIndex((incident) => incident.incidentId === incidentId);
    if (index < 0) {
      return null;
    }
    document.incidents[index] = {
      ...document.incidents[index],
      status: "dismissed",
      updatedAt: new Date().toISOString(),
    };
    writeDocument(document);
    return document.incidents[index];
  };

  const appendExecutedAction = (
    incidentId: string,
    action: DesktopBridgeExecutedAction,
  ): BridgeIncidentRecord | null => {
    const document = readDocument();
    const index = document.incidents.findIndex((incident) => incident.incidentId === incidentId);
    if (index < 0) {
      return null;
    }
    document.incidents[index] = {
      ...document.incidents[index],
      executedActions: [...document.incidents[index].executedActions, action],
      updatedAt: new Date().toISOString(),
    };
    writeDocument(document);
    return document.incidents[index];
  };

  return {
    recordIncident,
    listIncidents,
    getIncident,
    dismissIncident,
    appendExecutedAction,
  };
}
