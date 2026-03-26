"use client";

import { BridgeIncidentsPanel } from "./BridgeIncidentsPanel";

type BridgeDiagnosticsSectionProps = {
  bridgeAvailable: boolean;
};

export function BridgeDiagnosticsSection({
  bridgeAvailable,
}: BridgeDiagnosticsSectionProps) {
  return <BridgeIncidentsPanel bridgeAvailable={bridgeAvailable} />;
}
