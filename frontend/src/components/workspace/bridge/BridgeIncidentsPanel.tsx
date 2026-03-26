"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  createBridgeClient,
  type BridgeIncidentRecord,
  type BridgeRunActionResult,
} from "@/core/bridge/client";

type BridgeIncidentsPanelProps = {
  bridgeAvailable: boolean;
};

export function BridgeIncidentsPanel({
  bridgeAvailable,
}: BridgeIncidentsPanelProps) {
  const [working, setWorking] = useState(false);
  const [incidents, setIncidents] = useState<BridgeIncidentRecord[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<BridgeRunActionResult | null>(null);

  const selectedIncident = incidents.find((incident) => incident.incidentId === selectedIncidentId)
    ?? incidents[0]
    ?? null;

  const refreshIncidents = async () => {
    if (!bridgeAvailable) {
      return;
    }
    const client = createBridgeClient();
    const next = await client.listIncidents({ limit: 10 });
    setIncidents(next);
    setSelectedIncidentId((current) => current ?? next[0]?.incidentId ?? null);
  };

  useEffect(() => {
    void refreshIncidents();
  }, [bridgeAvailable]);

  const diagnose = async () => {
    setWorking(true);
    try {
      const client = createBridgeClient();
      const incident = await client.diagnose({ source: "bridge_page" });
      await refreshIncidents();
      setSelectedIncidentId(incident.incidentId);
      setActionResult(null);
    } finally {
      setWorking(false);
    }
  };

  const dismiss = async (incidentId: string) => {
    setWorking(true);
    try {
      const client = createBridgeClient();
      await client.dismissIncident(incidentId);
      await refreshIncidents();
      setActionResult(null);
    } finally {
      setWorking(false);
    }
  };

  const runAction = async (incidentId: string, actionId: string, label: string) => {
    if (!window.confirm(`Run "${label}"?`)) {
      return;
    }
    setWorking(true);
    try {
      const client = createBridgeClient();
      const result = await client.runAction({ incidentId, actionId });
      setActionResult(result);
      await refreshIncidents();
      if (result.incident) {
        setSelectedIncidentId(result.incident.incidentId);
      }
    } finally {
      setWorking(false);
    }
  };

  if (!bridgeAvailable) {
    return null;
  }

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Self-Heal</h3>
          <p className="text-muted-foreground text-xs">
            Diagnose the bridge runtime and confirm bounded recovery actions.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void diagnose()} disabled={working}>
          Diagnose Bridge
        </Button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-2">
          {incidents.length === 0 ? (
            <div className="text-muted-foreground rounded-md border p-3 text-xs">
              No bridge incidents yet.
            </div>
          ) : (
            incidents.map((incident) => (
              <button
                key={incident.incidentId}
                type="button"
                onClick={() => setSelectedIncidentId(incident.incidentId)}
                className={`w-full rounded-md border p-3 text-left text-sm ${
                  selectedIncidentId === incident.incidentId ? "border-foreground/40" : ""
                }`}
              >
                <div className="font-medium">{incident.summary}</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  {incident.incidentType} · {incident.severity} · {incident.status}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="space-y-3">
          {selectedIncident ? (
            <>
              <div className="space-y-1">
                <div className="text-sm font-medium">{selectedIncident.summary}</div>
                <div className="text-muted-foreground text-sm">
                  {selectedIncident.userVisibleExplanation}
                </div>
                {selectedIncident.rootCauseHypothesis ? (
                  <div className="text-muted-foreground text-xs">
                    Hypothesis: {selectedIncident.rootCauseHypothesis}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide">
                  Recommended Actions
                </div>
                {selectedIncident.recommendedActions.length === 0 ? (
                  <div className="text-muted-foreground rounded-md border p-3 text-xs">
                    No executable actions suggested for this incident.
                  </div>
                ) : (
                  selectedIncident.recommendedActions.map((action) => (
                    <div key={action.actionId} className="rounded-md border p-3">
                      <div className="font-medium text-sm">{action.label}</div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {action.reason}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={working || !action.executableNow}
                          onClick={() =>
                            void runAction(
                              selectedIncident.incidentId,
                              action.actionId,
                              action.label,
                            )
                          }
                        >
                          Confirm and Run
                        </Button>
                        {!action.executableNow ? (
                          <span className="text-muted-foreground text-xs">Advisory only</span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={working || selectedIncident.status === "dismissed"}
                  onClick={() => void dismiss(selectedIncident.incidentId)}
                >
                  Dismiss Incident
                </Button>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground rounded-md border p-3 text-xs">
              Select an incident after running a diagnosis.
            </div>
          )}

          {actionResult ? (
            <div className="rounded-md border p-3 text-xs">
              <div className="font-medium">Last Action Result</div>
              <div className="text-muted-foreground mt-1">
                {actionResult.status}: {actionResult.resultSummary}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
