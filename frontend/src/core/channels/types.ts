export type ChannelOpsItem = {
  enabled: boolean;
  running: boolean;
  capabilities: {
    supports_streaming: boolean;
  };
  last_heartbeat: number | null;
  last_error: string | null;
  authorized_user_count: number;
  pending_pair_request_count: number;
  can_restart: boolean;
};

export type ChannelOpsResponse = {
  service_running: boolean;
  pending_pair_requests: number;
  channels: Record<string, ChannelOpsItem>;
};

export type ChannelRestartResponse = {
  success: boolean;
  message: string;
};
