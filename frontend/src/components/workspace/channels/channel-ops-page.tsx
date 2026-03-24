"use client";

import {
  ActivityIcon,
  RefreshCwIcon,
  RadioIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRestartChannel, useChannelOps } from "@/core/channels/hooks";
import { useI18n } from "@/core/i18n/hooks";

function formatHeartbeat(value: number | null) {
  if (value == null) {
    return "—";
  }

  return new Date(value * 1000).toLocaleString();
}

function capabilityLabel(
  supportsStreaming: boolean,
  t: ReturnType<typeof useI18n>["t"],
) {
  return supportsStreaming
    ? t.channelOps.capabilities.streaming
    : t.channelOps.capabilities.nonStreaming;
}

export function ChannelOpsPage() {
  const { t } = useI18n();
  const { channelOps, isLoading, error } = useChannelOps();
  const restartMutation = useRestartChannel();

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">
        {t.channelOps.loading}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.channelOps.title}</CardTitle>
          <CardDescription>{t.channelOps.errorState}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">{error.message}</CardContent>
      </Card>
    );
  }

  if (!channelOps?.service_running) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.channelOps.title}</CardTitle>
          <CardDescription>{t.channelOps.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {t.channelOps.serviceDown}
        </CardContent>
      </Card>
    );
  }

  const channels = Object.entries(channelOps.channels).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.channelOps.title}</CardTitle>
          <CardDescription>{t.channelOps.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              {t.channelOps.summary.service}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm font-medium">
              <ActivityIcon className="size-4" />
              {channelOps.service_running
                ? t.channelOps.summary.running
                : t.channelOps.summary.down}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              {t.channelOps.summary.pending}
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {channelOps.pending_pair_requests}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              {t.channelOps.summary.channels}
            </div>
            <div className="mt-2 text-2xl font-semibold">{channels.length}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {channels.map(([name, channel]) => (
          <Card key={name}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="capitalize">{name}</CardTitle>
                  <CardDescription>
                    {capabilityLabel(
                      channel.capabilities.supports_streaming,
                      t,
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={channel.enabled ? "default" : "outline"}>
                    {channel.enabled
                      ? t.channelOps.badges.enabled
                      : t.channelOps.badges.disabled}
                  </Badge>
                  <Badge variant={channel.running ? "default" : "secondary"}>
                    {channel.running
                      ? t.channelOps.badges.running
                      : t.channelOps.badges.stopped}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">
                    {t.channelOps.fields.lastHeartbeat}
                  </div>
                  <div className="mt-2">
                    {formatHeartbeat(channel.last_heartbeat)}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">
                    {t.channelOps.fields.lastError}
                  </div>
                  <div className="mt-2 break-words">
                    {channel.last_error ?? t.channelOps.fields.none}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">
                    {t.channelOps.fields.authorizedUsers}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <ShieldCheckIcon className="size-4" />
                    {channel.authorized_user_count}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">
                    {t.channelOps.fields.pendingRequests}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <RadioIcon className="size-4" />
                    {channel.pending_pair_request_count}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t">
              <span className="text-muted-foreground text-xs">
                {capabilityLabel(channel.capabilities.supports_streaming, t)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!channel.can_restart || restartMutation.isPending}
                onClick={() => restartMutation.mutate(name)}
              >
                <RefreshCwIcon className="size-4" />
                {restartMutation.isPending
                  ? t.channelOps.restart.inProgress
                  : t.channelOps.restart.action}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
