import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  DesktopBridgeObservationLevel,
  DesktopBridgeObservationRecord,
  DesktopBridgeObservationType,
} from "../../shared/bridge-ipc.js";

export type BridgeObservationRecord = DesktopBridgeObservationRecord;

export type BridgeObservationInput = {
  observationType: DesktopBridgeObservationType;
  level: DesktopBridgeObservationLevel;
  adapterPlatform: string | null;
  bindingId: string | null;
  threadId: string | null;
  summary: string;
  details: Record<string, unknown>;
};

type BridgeObservationsDocument = {
  observations: BridgeObservationRecord[];
};

const DEFAULT_DOCUMENT: BridgeObservationsDocument = {
  observations: [],
};

export function createBridgeObservationsStore(
  filePath: string,
  options: { maxItems?: number } = {},
) {
  const resolvedPath = path.resolve(filePath);
  const maxItems = options.maxItems ?? 200;

  const ensureParent = () => {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  };

  const readDocument = (): BridgeObservationsDocument => {
    if (!fs.existsSync(resolvedPath)) {
      return { ...DEFAULT_DOCUMENT };
    }

    const raw = fs.readFileSync(resolvedPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<BridgeObservationsDocument>;
    return {
      observations: Array.isArray(parsed.observations) ? [...parsed.observations] : [],
    };
  };

  const writeDocument = (document: BridgeObservationsDocument) => {
    ensureParent();
    fs.writeFileSync(resolvedPath, JSON.stringify(document, null, 2), "utf8");
  };

  const appendObservation = (input: BridgeObservationInput): BridgeObservationRecord => {
    const document = readDocument();
    const observation: BridgeObservationRecord = {
      observationId: randomUUID(),
      timestamp: new Date().toISOString(),
      ...input,
    };
    document.observations.push(observation);
    if (document.observations.length > maxItems) {
      document.observations = document.observations.slice(-maxItems);
    }
    writeDocument(document);
    return observation;
  };

  const listObservations = (filters: {
    observationType?: DesktopBridgeObservationType;
    level?: DesktopBridgeObservationLevel;
    adapterPlatform?: string;
    limit?: number;
  } = {}): BridgeObservationRecord[] => {
    const observations = readDocument().observations
      .slice()
      .reverse()
      .filter((observation: BridgeObservationRecord) => (filters.observationType ? observation.observationType === filters.observationType : true))
      .filter((observation: BridgeObservationRecord) => (filters.level ? observation.level === filters.level : true))
      .filter((observation: BridgeObservationRecord) => (filters.adapterPlatform ? observation.adapterPlatform === filters.adapterPlatform : true));

    if (typeof filters.limit === "number") {
      return observations.slice(0, filters.limit);
    }
    return observations;
  };

  return {
    appendObservation,
    listObservations,
  };
}
