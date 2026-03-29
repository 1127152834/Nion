"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAutomationPlatformCapabilities,
  useAutomationPlatformConnectors,
} from "@/core/automation/hooks";

const FALLBACK_WEBHOOK_VERSIONS = ["1"];
const FALLBACK_PLUGIN_ACTIONS = ["echo.plugin"];
const FALLBACK_CONNECTORS = ["generic_webhook"];

export function OpenPlatformSection() {
  const { capabilities } = useAutomationPlatformCapabilities();
  const { connectors } = useAutomationPlatformConnectors();
  const webhookVersions =
    capabilities.webhook_event_versions.length > 0
      ? capabilities.webhook_event_versions
      : FALLBACK_WEBHOOK_VERSIONS;
  const pluginActions =
    capabilities.plugin_actions.length > 0
      ? capabilities.plugin_actions
      : FALLBACK_PLUGIN_ACTIONS;
  const connectorIds =
    connectors.length > 0
      ? connectors.map((connector) => String(connector.id))
      : FALLBACK_CONNECTORS;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Open Platform</h2>
        <p className="text-sm text-muted-foreground">
          Review webhook contract versions and registered plugin actions.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Webhook versions</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 text-sm">
            {webhookVersions.map((version) => (
              <div key={version}>{version}</div>
            ))}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Plugin actions</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 text-sm">
            {pluginActions.map((pluginAction) => (
              <div key={pluginAction}>{pluginAction}</div>
            ))}
          </CardContent>
        </Card>

        <Card className="py-0 lg:col-span-2">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Connectors</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 text-sm">
            {connectorIds.map((connectorId) => (
              <div key={connectorId}>{connectorId}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
