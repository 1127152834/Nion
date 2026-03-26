import type {
  DesktopBridgeExecutedAction,
  DesktopBridgeRunActionRequest,
  DesktopBridgeRunActionResult,
} from "../../shared/bridge-ipc.js";
import type { WeixinQrLoginSession } from "./weixin/auth.js";
import type { BridgeIncidentRecord } from "./incidents-store.js";

type ActionRunnerDependencies = {
  incidentStore: {
    getIncident: (incidentId: string) => BridgeIncidentRecord | null;
    appendExecutedAction: (
      incidentId: string,
      action: DesktopBridgeExecutedAction,
    ) => BridgeIncidentRecord | null;
  };
  restartBridgeRuntime: () => Promise<void>;
  probePlatform: (platform: string) => Promise<{ ok: boolean; message: string }>;
  startWeixinLogin: () => Promise<WeixinQrLoginSession>;
};

const ALLOWLIST = new Set([
  "restart_bridge_runtime",
  "probe_platform",
  "start_weixin_login",
]);

function rejectedResult(
  request: DesktopBridgeRunActionRequest,
  incident: BridgeIncidentRecord | null,
  resultSummary: string,
): DesktopBridgeRunActionResult {
  return {
    ok: false,
    actionId: request.actionId,
    status: "rejected",
    resultSummary,
    incident,
  };
}

export function createBridgeActionRunner(deps: ActionRunnerDependencies) {
  return {
    async runAction(
      request: DesktopBridgeRunActionRequest,
    ): Promise<DesktopBridgeRunActionResult> {
      const incident = deps.incidentStore.getIncident(request.incidentId);
      if (!incident) {
        return rejectedResult(request, null, "Incident not found");
      }

      const action = incident.recommendedActions.find(
        (item) => item.actionId === request.actionId,
      );
      if (!action) {
        return rejectedResult(request, incident, "Recommended action not found on incident");
      }
      if (!action.executableNow || action.ipcChannel !== "bridge:run-action") {
        return rejectedResult(request, incident, "Recommended action is not executable");
      }
      if (!ALLOWLIST.has(action.actionType)) {
        return rejectedResult(request, incident, "Recommended action is not allowlisted");
      }

      const executedAt = new Date().toISOString();
      let status: DesktopBridgeExecutedAction["status"] = "completed";
      let resultSummary = "";
      let payload: Record<string, unknown> | undefined;

      try {
        switch (action.actionType) {
          case "restart_bridge_runtime":
            await deps.restartBridgeRuntime();
            resultSummary = "Bridge runtime restarted";
            payload = { actionType: action.actionType };
            break;
          case "probe_platform": {
            const platform =
              typeof action.platform === "string" && action.platform
                ? action.platform
                : typeof action.ipcArgs.platform === "string"
                  ? action.ipcArgs.platform
                  : "";
            const probe = await deps.probePlatform(platform);
            status = probe.ok ? "completed" : "failed";
            resultSummary = probe.message;
            payload = { actionType: action.actionType, platform, probe };
            break;
          }
          case "start_weixin_login": {
            const session = await deps.startWeixinLogin();
            resultSummary = `Weixin login started (${session.status})`;
            payload = {
              actionType: action.actionType,
              sessionId: session.sessionId,
              status: session.status,
            };
            break;
          }
          default:
            return rejectedResult(request, incident, "Recommended action is not supported");
        }
      } catch (error) {
        status = "failed";
        resultSummary = error instanceof Error ? error.message : String(error);
        payload = { actionType: action.actionType };
      }

      const updatedIncident = deps.incidentStore.appendExecutedAction(
        request.incidentId,
        {
          actionId: request.actionId,
          executedAt,
          status,
          resultSummary,
        },
      );

      return {
        ok: status === "completed",
        actionId: request.actionId,
        status,
        resultSummary,
        incident: updatedIncident,
        payload,
      };
    },
  };
}
