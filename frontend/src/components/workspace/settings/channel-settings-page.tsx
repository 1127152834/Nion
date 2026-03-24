"use client";

import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CopyIcon,
  LinkIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShieldCheckIcon,
  UnplugIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useApprovePairRequest,
  useAuthorizedUsers,
  useChannelConfig,
  useChannelRuntimeStatus,
  useCreatePairingCode,
  usePendingPairRequests,
  useRejectPairRequest,
  useRevokeAuthorizedUser,
  useTestChannelConnection,
  useUpdateAuthorizedUserSessionOverride,
  useUpsertChannelConfig,
  type ChannelAuthorizedUser,
  type ChannelMode,
  type ChannelPlatform,
  type ChannelSessionConfig,
} from "@/core/channels";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

import { SettingsSection } from "./settings-section";

type ChannelFormState = {
  enabled: boolean;
  mode: ChannelMode;
  credentials: Record<string, string>;
};

type SessionBooleanState = "inherit" | "enabled" | "disabled";

type ChannelSessionFormState = {
  assistant_id: string;
  recursion_limit: string;
  thinking_enabled: SessionBooleanState;
  is_plan_mode: SessionBooleanState;
  subagent_enabled: SessionBooleanState;
};

type CredentialFieldSpec = {
  key: string;
  label: string;
  sensitive?: boolean;
  modes?: ChannelMode[];
  requiredModes?: ChannelMode[];
  kind?: "input" | "proxy-mode";
  hint?: string;
};

const SINGLE_WORKSPACE_ID = "default";
const PAIR_CODE_SLOT_COUNT = 6;
const DEFAULT_SESSION_FORM_STATE: ChannelSessionFormState = {
  assistant_id: "",
  recursion_limit: "",
  thinking_enabled: "inherit",
  is_plan_mode: "inherit",
  subagent_enabled: "inherit",
};

const FALLBACK_COPY = {
  title: "Channels",
  description: "Manage channel credentials, modes, pairing, authorization, and runtime status.",
  workspaceTitle: "Single Workspace",
  workspaceDescription:
    "Nion uses a single app workspace. Channel authorization binds to the current app workspace instead of letting operators choose between multiple workspaces.",
  platformLark: "Lark",
  platformDingTalk: "DingTalk",
  platformTelegram: "Telegram",
  configurationTitle: "Channel Configuration",
  configurationDescription:
    "Fill credentials, verify connectivity, then handle pairing and authorization from the same control surface.",
  setupDocsAction: "Setup Docs",
  enabledLabel: "Enabled",
  disabledLabel: "Disabled",
  accessModeLabel: "Access Mode",
  webhookOption: "Webhook (HTTP callback)",
  streamOption: "Stream (persistent connection)",
  requiredLabel: "Required",
  optionalLabel: "Optional",
  proxyModeAuto: "auto (adaptive)",
  proxyModeDirect: "direct (no proxy)",
  proxyModeSystem: "system (system proxy)",
  sessionDefaultsTitle: "Session Defaults",
  sessionDefaultsDescription:
    "Configure default session parameters for this channel. Only explicitly filled fields are sent to runtime.",
  sessionAssistantIdLabel: "Assistant ID",
  sessionAssistantIdPlaceholder: "Leave empty to inherit",
  sessionRecursionLimitLabel: "Recursion Limit",
  sessionRecursionLimitPlaceholder: "Leave empty to inherit",
  sessionThinkingLabel: "Thinking",
  sessionPlanModeLabel: "Plan Mode",
  sessionSubagentLabel: "Subagent",
  sessionInheritOption: "Inherit",
  sessionEnabledOption: "Enabled",
  sessionDisabledOption: "Disabled",
  sessionInheritLabel: "Inherit current defaults",
  testConnectionAction: "Test Connection",
  saveAndApplyAction: "Save & Apply",
  connectedLabel: "Connected",
  disconnectedLabel: "Disconnected",
  connectionFailedLabel: "Connection failed",
  fillRequiredFieldsFirst: "Please fill required fields first: {fields}",
  fillConnectionFieldsFirst: "Please fill required fields for connection test: {fields}",
  saveConfigFailed: "Failed to save configuration",
  connectionTestFailed: "Connection test failed",
  platformConfigSaved: "{platform} configuration saved",
  platformConnectionSuccess: "{platform} connection test succeeded",
  missingRequiredFieldsPrefix: "Missing required fields for current mode: ",
  pairingGuideText:
    'Successful connection only means the channel is reachable. Next: ask the user to send any message, then approve it in "Pending Pair Requests" below.',
  goToPairingAction: "Go to Pairing & Authorization",
  runtimeStatusTitle: "Runtime Status",
  runtimeStatusDescription:
    "This card shows runtime health and operator-visible status that should stay aligned with the running connector.",
  refreshAction: "Refresh",
  activeUsersLabel: "Active users",
  runningLabel: "Running",
  stoppedLabel: "Stopped",
  noRuntimeStatus: "No runtime status",
  pairSectionTitle: "Pairing & Authorization",
  pairSectionDescription:
    "Generate a temporary pair code, approve inbound pairing requests, and manage authorized users.",
  pairCodeTitle: "Pair Code",
  pairCodeDescription:
    "Recommend users sending any message first. `/pair 123456` is available as a manual fallback.",
  pairCodeExpireMinutes: "minutes to expire",
  generateAction: "Generate",
  activePairCode: "Active pair code",
  noPairCodeGenerated: "No pair code generated",
  pairCommandCopied: "Pair command copied",
  pairCodeGenerated: "Pair code generated: {code}",
  pairCodeGenerateFailed: "Failed to generate pair code",
  expiresAtPrefix: "Expires at",
  pairCodeSlotHint: "A 6-digit pair code will be shown here after generation",
  pendingPairRequestsTitle: "Pending Pair Requests",
  noPendingRequests: "No pending requests",
  approveAction: "Approve",
  rejectAction: "Reject",
  approvedToast: "Approved and authorized",
  rejectedToast: "Rejected",
  approveFailedToast: "Approve failed",
  rejectFailedToast: "Reject failed",
  authorizedUsersTitle: "Authorized Users",
  noAuthorizedUsers: "No authorized users",
  sessionOverrideBadge: "Session Override",
  sessionOverrideAction: "Session Override",
  revokeAction: "Revoke",
  revokeConfirmTemplate:
    'Revoke channel authorization for "{name}"? The user will need to pair again.',
  authorizationRevokedToast: "Authorization revoked",
  revokeFailedToast: "Revoke failed",
  sessionOverrideDialogTitle: "Edit Session Override",
  sessionOverrideDialogDescription:
    "Configure higher-priority session parameters for an authorized user. Leave empty or choose inherit to fall back to channel defaults.",
  sessionOverrideCurrentLabel: "Current override",
  sessionResetAction: "Reset to inherit",
  cancelAction: "Cancel",
  sessionOverrideSavedToast: "Session override saved",
  sessionOverrideSaveFailedToast: "Failed to save session override",
  loadingLabel: "Loading...",
  conversationTypeConversation: "Conversation",
  conversationTypeGroup: "Group",
  conversationTypeDirect: "Direct",
  requestedAtLabel: "Requested at",
  grantedAtLabel: "Granted at",
  unknownTimeLabel: "Unknown time",
  larkVerificationTokenHint: "Required for webhook challenge verification.",
  larkEncryptKeyHint: "Optional encryption key for Lark event payloads.",
  dingtalkRobotCodeHint: "Required when DingTalk stream mode uses robot-code routing.",
  dingtalkProxyModeHint: "Controls how the runtime resolves outbound network access.",
  dingtalkWebhookUrlHint: "Webhook URL issued by DingTalk for callback mode.",
} as const;

type ChannelCopy = {
  [K in keyof typeof FALLBACK_COPY]: string;
};

const PLATFORM_FIELDS: Record<ChannelPlatform, CredentialFieldSpec[]> = {
  lark: [
    { key: "app_id", label: "App ID", requiredModes: ["webhook", "stream"] },
    {
      key: "app_secret",
      label: "App Secret",
      sensitive: true,
      requiredModes: ["webhook", "stream"],
    },
    {
      key: "verification_token",
      label: "Verification Token",
      sensitive: true,
      modes: ["webhook"],
      hint: FALLBACK_COPY.larkVerificationTokenHint,
    },
    {
      key: "encrypt_key",
      label: "Encrypt Key",
      sensitive: true,
      modes: ["webhook"],
      hint: FALLBACK_COPY.larkEncryptKeyHint,
    },
  ],
  dingtalk: [
    { key: "client_id", label: "Client ID", requiredModes: ["webhook", "stream"] },
    {
      key: "client_secret",
      label: "Client Secret",
      sensitive: true,
      requiredModes: ["webhook", "stream"],
    },
    {
      key: "robot_code",
      label: "Robot Code",
      modes: ["stream"],
      hint: FALLBACK_COPY.dingtalkRobotCodeHint,
    },
    {
      key: "proxy_mode",
      label: "Proxy Mode",
      modes: ["stream"],
      kind: "proxy-mode",
      hint: FALLBACK_COPY.dingtalkProxyModeHint,
    },
    {
      key: "webhook_url",
      label: "Webhook URL",
      modes: ["webhook"],
      requiredModes: ["webhook"],
      hint: FALLBACK_COPY.dingtalkWebhookUrlHint,
    },
    {
      key: "signing_secret",
      label: "Signing Secret",
      sensitive: true,
      modes: ["webhook"],
    },
  ],
  telegram: [
    {
      key: "bot_token",
      label: "Bot Token",
      sensitive: true,
      requiredModes: ["webhook", "stream"],
    },
    { key: "allowed_users", label: "Allowed Users" },
    { key: "secret_token", label: "Secret Token", sensitive: true, modes: ["webhook"] },
  ],
};

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function isFieldVisible(field: CredentialFieldSpec, mode: ChannelMode): boolean {
  if (!field.modes || field.modes.length === 0) {
    return true;
  }
  return field.modes.includes(mode);
}

function isFieldRequired(field: CredentialFieldSpec, mode: ChannelMode): boolean {
  if (!field.requiredModes || field.requiredModes.length === 0) {
    return false;
  }
  return field.requiredModes.includes(mode);
}

function toSessionBooleanState(value: boolean | undefined): SessionBooleanState {
  if (value === true) {
    return "enabled";
  }
  if (value === false) {
    return "disabled";
  }
  return "inherit";
}

function fromSessionBooleanState(value: SessionBooleanState): boolean | undefined {
  if (value === "enabled") {
    return true;
  }
  if (value === "disabled") {
    return false;
  }
  return undefined;
}

function sessionConfigToFormState(session?: ChannelSessionConfig | null): ChannelSessionFormState {
  return {
    assistant_id: session?.assistant_id ?? "",
    recursion_limit:
      typeof session?.config?.recursion_limit === "number"
        ? String(session.config.recursion_limit)
        : "",
    thinking_enabled: toSessionBooleanState(session?.context?.thinking_enabled),
    is_plan_mode: toSessionBooleanState(session?.context?.is_plan_mode),
    subagent_enabled: toSessionBooleanState(session?.context?.subagent_enabled),
  };
}

function sessionFormToConfig(form: ChannelSessionFormState): ChannelSessionConfig | undefined {
  const assistantId = form.assistant_id.trim();
  const recursionRaw = form.recursion_limit.trim();
  const recursionLimit = recursionRaw ? Number.parseInt(recursionRaw, 10) : Number.NaN;
  const thinkingEnabled = fromSessionBooleanState(form.thinking_enabled);
  const isPlanMode = fromSessionBooleanState(form.is_plan_mode);
  const subagentEnabled = fromSessionBooleanState(form.subagent_enabled);

  const config: ChannelSessionConfig = {};
  if (assistantId) {
    config.assistant_id = assistantId;
  }
  if (Number.isFinite(recursionLimit) && recursionLimit > 0) {
    config.config = { recursion_limit: recursionLimit };
  }

  const context: NonNullable<ChannelSessionConfig["context"]> = {};
  if (thinkingEnabled !== undefined) {
    context.thinking_enabled = thinkingEnabled;
  }
  if (isPlanMode !== undefined) {
    context.is_plan_mode = isPlanMode;
  }
  if (subagentEnabled !== undefined) {
    context.subagent_enabled = subagentEnabled;
  }
  if (Object.keys(context).length > 0) {
    config.context = context;
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

function describeSessionConfig(
  session: ChannelSessionConfig | null | undefined,
  copy: ChannelCopy,
): string[] {
  if (!session) {
    return [copy.sessionInheritLabel];
  }

  const items: string[] = [];
  if (session.assistant_id) {
    items.push(`${copy.sessionAssistantIdLabel}: ${session.assistant_id}`);
  }
  if (typeof session.config?.recursion_limit === "number") {
    items.push(`${copy.sessionRecursionLimitLabel}: ${session.config.recursion_limit}`);
  }
  if (typeof session.context?.thinking_enabled === "boolean") {
    items.push(`${copy.sessionThinkingLabel}: ${session.context.thinking_enabled ? "On" : "Off"}`);
  }
  if (typeof session.context?.is_plan_mode === "boolean") {
    items.push(`${copy.sessionPlanModeLabel}: ${session.context.is_plan_mode ? "On" : "Off"}`);
  }
  if (typeof session.context?.subagent_enabled === "boolean") {
    items.push(`${copy.sessionSubagentLabel}: ${session.context.subagent_enabled ? "On" : "Off"}`);
  }

  return items.length > 0 ? items : [copy.sessionInheritLabel];
}

function formatConversationType(
  value: string | null | undefined,
  copy: ChannelCopy,
): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) {
    return copy.conversationTypeConversation;
  }
  if (normalized.includes("group")) {
    return copy.conversationTypeGroup;
  }
  if (normalized.includes("single") || normalized.includes("private") || normalized.includes("direct")) {
    return copy.conversationTypeDirect;
  }
  return copy.conversationTypeConversation;
}

function formatDateTime(value: string | null | undefined, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return date.toLocaleString(locale);
}

function platformTitle(platform: ChannelPlatform, copy: ChannelCopy): string {
  if (platform === "lark") {
    return copy.platformLark;
  }
  if (platform === "dingtalk") {
    return copy.platformDingTalk;
  }
  return copy.platformTelegram;
}

function platformDocsUrl(platform: ChannelPlatform): string {
  if (platform === "lark") {
    return "https://open.feishu.cn/document/develop-an-echo-bot/introduction";
  }
  if (platform === "dingtalk") {
    return "https://open.dingtalk.com/document/orgapp/overview";
  }
  return "https://core.telegram.org/bots/api";
}

function SessionBooleanSelect({
  value,
  onValueChange,
  copy,
}: {
  value: SessionBooleanState;
  onValueChange: (value: SessionBooleanState) => void;
  copy: ChannelCopy;
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as SessionBooleanState)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="inherit">{copy.sessionInheritOption}</SelectItem>
        <SelectItem value="enabled">{copy.sessionEnabledOption}</SelectItem>
        <SelectItem value="disabled">{copy.sessionDisabledOption}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function SessionSummaryBadges({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function InlineError({ error }: { error: string }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
      <div className="text-destructive flex items-start gap-2">
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
        <div>{error}</div>
      </div>
    </div>
  );
}

function PairCodeBlock({
  platform,
  pairCommandLabel,
  copy,
}: {
  platform: ChannelPlatform;
  pairCommandLabel: string;
  copy: ChannelCopy;
}) {
  const { locale } = useI18n();
  const createPairingCode = useCreatePairingCode(platform);
  const [ttlMinutes, setTtlMinutes] = useState("10");

  const latestCode = createPairingCode.data;
  const normalizedPairCode = useMemo(
    () => (latestCode?.code ?? "").replace(/\s+/g, "").toUpperCase(),
    [latestCode?.code],
  );
  const pairCodeSlots = useMemo(
    () =>
      Array.from(
        { length: PAIR_CODE_SLOT_COUNT },
        (_, index) => normalizedPairCode[index] ?? "",
      ),
    [normalizedPairCode],
  );
  const pairCommandToCopy = useMemo(() => {
    if (!normalizedPairCode) {
      return "";
    }
    return pairCommandLabel.replace("123456", normalizedPairCode);
  }, [normalizedPairCode, pairCommandLabel]);

  const onGenerate = () => {
    const ttl = Number.parseInt(ttlMinutes, 10);
    void createPairingCode
      .mutateAsync(Number.isFinite(ttl) && ttl > 0 ? ttl : 10)
      .then((result) => {
        toast.success(copy.pairCodeGenerated.replaceAll("{code}", result.code));
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : copy.pairCodeGenerateFailed);
      });
  };

  return (
    <section className="flex h-full flex-col space-y-3 rounded-md border p-3">
      <div className="space-y-1">
        <div className="text-sm font-medium">{copy.pairCodeTitle}</div>
        <div className="text-muted-foreground text-xs">
          {copy.pairCodeDescription}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={ttlMinutes}
          onChange={(event) => setTtlMinutes(event.target.value.replace(/[^\d]/g, ""))}
          className="h-8 w-20 text-sm"
          inputMode="numeric"
        />
        <div className="text-muted-foreground text-xs">{copy.pairCodeExpireMinutes}</div>
        <Button
          size="sm"
          onClick={onGenerate}
          disabled={createPairingCode.isPending}
          className="ml-auto"
        >
          {createPairingCode.isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-4" />
          )}
          {copy.generateAction}
        </Button>
      </div>

      <div className="bg-muted/20 flex min-h-[160px] flex-1 flex-col justify-between rounded-md border px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-muted-foreground text-xs">
            {latestCode ? copy.activePairCode : copy.noPairCodeGenerated}
          </div>
          {latestCode ? (
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(pairCommandToCopy || latestCode.code);
                toast.success(copy.pairCommandCopied);
              }}
            >
              <CopyIcon className="size-4" />
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-6 gap-2">
          {pairCodeSlots.map((char, index) => (
            <div
              key={`pair-code-slot-${index}`}
              className={cn(
                "flex h-14 items-center justify-center rounded-md text-xl font-mono tracking-wider",
                latestCode
                  ? "border bg-background text-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.08)]"
                  : "border border-dashed bg-background/35 text-transparent",
              )}
            >
              {char || " "}
            </div>
          ))}
        </div>

        <div className="text-muted-foreground text-xs">
          {latestCode
            ? `${copy.expiresAtPrefix}: ${new Date(latestCode.expires_at).toLocaleString(locale)}`
            : copy.pairCodeSlotHint}
        </div>
      </div>
    </section>
  );
}

function ChannelPlatformPanel({
  platform,
  copy,
}: {
  platform: ChannelPlatform;
  copy: ChannelCopy;
}) {
  const { locale } = useI18n();
  const fields = PLATFORM_FIELDS[platform];

  const {
    data: config,
    isLoading: configLoading,
    error: configError,
  } = useChannelConfig(platform);
  const upsertConfig = useUpsertChannelConfig(platform);
  const testConnection = useTestChannelConnection(platform);
  const {
    data: runtimeStatus,
    isLoading: runtimeLoading,
    error: runtimeError,
    refetch: refetchRuntime,
  } = useChannelRuntimeStatus(platform, { enabled: true });
  const {
    data: pendingRequests = [],
    isLoading: pendingLoading,
  } = usePendingPairRequests(platform);
  const {
    data: authorizedUsers = [],
    isLoading: usersLoading,
  } = useAuthorizedUsers(platform);
  const approvePairRequest = useApprovePairRequest(platform);
  const rejectPairRequest = useRejectPairRequest(platform);
  const revokeAuthorizedUser = useRevokeAuthorizedUser(platform);
  const updateAuthorizedUserSessionOverride =
    useUpdateAuthorizedUserSessionOverride(platform);

  const [form, setForm] = useState<ChannelFormState>({
    enabled: false,
    mode: platform === "lark" ? "webhook" : "stream",
    credentials: {},
  });
  const [sessionDefaultsForm, setSessionDefaultsForm] = useState<ChannelSessionFormState>(
    DEFAULT_SESSION_FORM_STATE,
  );
  const [editingAuthorizedUser, setEditingAuthorizedUser] =
    useState<ChannelAuthorizedUser | null>(null);
  const [authorizedUserSessionForm, setAuthorizedUserSessionForm] =
    useState<ChannelSessionFormState>(DEFAULT_SESSION_FORM_STATE);

  useEffect(() => {
    if (!config) {
      return;
    }
    setForm({
      enabled: Boolean(config.enabled),
      mode: config.mode,
      credentials: { ...config.credentials },
    });
    setSessionDefaultsForm(sessionConfigToFormState(config.session));
  }, [config]);

  const title = platformTitle(platform, copy);
  const docsUrl = platformDocsUrl(platform);
  const configErrorMessage = stringifyError(configError);
  const runtimeErrorMessage = stringifyError(runtimeError);
  const pairCommandLabel = "/pair 123456";
  const pairingSectionId = `${platform}-pairing-authorization`;

  const visibleFields = useMemo(
    () => fields.filter((field) => isFieldVisible(field, form.mode)),
    [fields, form.mode],
  );

  const missingRequiredFields = useMemo(
    () =>
      visibleFields.filter((field) => {
        if (!isFieldRequired(field, form.mode)) {
          return false;
        }
        return !(form.credentials[field.key] ?? "").trim();
      }),
    [form.credentials, form.mode, visibleFields],
  );

  const missingConnectivityFields = useMemo(() => {
    const requiredKeys = platform === "lark"
      ? ["app_id", "app_secret"]
      : platform === "dingtalk"
        ? ["client_id", "client_secret"]
        : ["bot_token"];
    return requiredKeys.filter((key) => !(form.credentials[key] ?? "").trim());
  }, [form.credentials, platform]);

  const sessionDefaultsConfig = useMemo(
    () => sessionFormToConfig(sessionDefaultsForm),
    [sessionDefaultsForm],
  );
  const sessionDefaultsSummary = useMemo(
    () => describeSessionConfig(sessionDefaultsConfig, copy),
    [copy, sessionDefaultsConfig],
  );
  const shouldShowPairingGuide =
    ((testConnection.data?.success ?? false) || (runtimeStatus?.connected ?? false))
    && authorizedUsers.length === 0;

  const onSave = () => {
    if (missingRequiredFields.length > 0) {
      toast.error(
        copy.fillRequiredFieldsFirst.replaceAll(
          "{fields}",
          missingRequiredFields.map((field) => field.label).join(", "),
        ),
      );
      return;
    }

    void upsertConfig
      .mutateAsync({
        enabled: form.enabled,
        mode: form.mode,
        credentials: form.credentials,
        default_workspace_id: SINGLE_WORKSPACE_ID,
        session: sessionDefaultsConfig ?? null,
      })
      .then(() => {
        toast.success(copy.platformConfigSaved.replaceAll("{platform}", title));
        void refetchRuntime();
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : copy.saveConfigFailed);
      });
  };

  const onTest = () => {
    if (missingConnectivityFields.length > 0) {
      toast.error(
        copy.fillConnectionFieldsFirst.replaceAll(
          "{fields}",
          missingConnectivityFields
            .map((key) => fields.find((field) => field.key === key)?.label ?? key)
            .join(", "),
        ),
      );
      return;
    }

    void testConnection
      .mutateAsync({
        credentials: form.credentials,
        timeout_seconds: 8,
      })
      .then((result) => {
        if (result.success) {
          toast.success(copy.platformConnectionSuccess.replaceAll("{platform}", title));
          return;
        }
        toast.error(result.message || copy.connectionTestFailed);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : copy.connectionTestFailed);
      });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {title} {copy.configurationTitle}
            </div>
            <div className="text-muted-foreground text-xs">
              {copy.configurationDescription}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={form.enabled ? "default" : "secondary"}>
              {form.enabled ? copy.enabledLabel : copy.disabledLabel}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a href={docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center">
                <LinkIcon className="size-4" />
                {copy.setupDocsAction}
                <ArrowUpRightIcon className="size-3.5 opacity-70" />
              </a>
            </Button>
          </div>
        </div>

        {configErrorMessage ? <InlineError error={configErrorMessage} /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <div className="text-xs font-medium">{copy.accessModeLabel}</div>
            <Select
              value={form.mode}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  mode: value as ChannelMode,
                }))
              }
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webhook">{copy.webhookOption}</SelectItem>
                <SelectItem value="stream">{copy.streamOption}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibleFields.map((field) => (
            <div className="space-y-1.5" key={field.key}>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <span>{field.label}</span>
                <Badge
                  variant={isFieldRequired(field, form.mode) ? "default" : "secondary"}
                  className="h-5 px-1.5 text-[10px]"
                >
                  {isFieldRequired(field, form.mode)
                    ? copy.requiredLabel
                    : copy.optionalLabel}
                </Badge>
              </div>

              {field.kind === "proxy-mode" ? (
                <Select
                  value={form.credentials[field.key] ?? "auto"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      credentials: {
                        ...current.credentials,
                        [field.key]: value,
                      },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{copy.proxyModeAuto}</SelectItem>
                    <SelectItem value="direct">{copy.proxyModeDirect}</SelectItem>
                    <SelectItem value="system">{copy.proxyModeSystem}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.credentials[field.key] ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      credentials: {
                        ...current.credentials,
                        [field.key]: event.target.value,
                      },
                    }))
                  }
                  type={field.sensitive ? "password" : "text"}
                />
              )}
              {field.hint ? (
                <p className="text-muted-foreground text-xs">{field.hint}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-xl border border-dashed bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">{copy.sessionDefaultsTitle}</div>
              <div className="text-muted-foreground text-xs leading-5">
                {copy.sessionDefaultsDescription}
              </div>
            </div>
            <SessionSummaryBadges items={sessionDefaultsSummary} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1.5">
              <div className="text-xs font-medium">{copy.sessionAssistantIdLabel}</div>
              <Input
                value={sessionDefaultsForm.assistant_id}
                onChange={(event) =>
                  setSessionDefaultsForm((current) => ({
                    ...current,
                    assistant_id: event.target.value,
                  }))
                }
                placeholder={copy.sessionAssistantIdPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium">{copy.sessionRecursionLimitLabel}</div>
              <Input
                value={sessionDefaultsForm.recursion_limit}
                onChange={(event) =>
                  setSessionDefaultsForm((current) => ({
                    ...current,
                    recursion_limit: event.target.value.replace(/[^\d]/g, ""),
                  }))
                }
                inputMode="numeric"
                placeholder={copy.sessionRecursionLimitPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium">{copy.sessionThinkingLabel}</div>
              <SessionBooleanSelect
                value={sessionDefaultsForm.thinking_enabled}
                onValueChange={(value) =>
                  setSessionDefaultsForm((current) => ({
                    ...current,
                    thinking_enabled: value,
                  }))
                }
                copy={copy}
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium">{copy.sessionPlanModeLabel}</div>
              <SessionBooleanSelect
                value={sessionDefaultsForm.is_plan_mode}
                onValueChange={(value) =>
                  setSessionDefaultsForm((current) => ({
                    ...current,
                    is_plan_mode: value,
                  }))
                }
                copy={copy}
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium">{copy.sessionSubagentLabel}</div>
              <SessionBooleanSelect
                value={sessionDefaultsForm.subagent_enabled}
                onValueChange={(value) =>
                  setSessionDefaultsForm((current) => ({
                    ...current,
                    subagent_enabled: value,
                  }))
                }
                copy={copy}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-1 flex items-center gap-2 text-sm">
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  enabled: checked,
                }))
              }
            />
            {form.enabled ? copy.enabledLabel : copy.disabledLabel}
          </label>
          <Button
            variant="outline"
            onClick={onTest}
            disabled={configLoading || testConnection.isPending || upsertConfig.isPending}
          >
            {testConnection.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
            {copy.testConnectionAction}
          </Button>
          <Button
            onClick={onSave}
            disabled={configLoading || upsertConfig.isPending}
          >
            {upsertConfig.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ShieldCheckIcon className="size-4" />
            )}
            {copy.saveAndApplyAction}
          </Button>
          {testConnection.data ? (
            <Badge variant={testConnection.data.success ? "default" : "destructive"}>
              {testConnection.data.success ? copy.connectedLabel : copy.connectionFailedLabel}
              {testConnection.data.latency_ms != null ? ` · ${testConnection.data.latency_ms}ms` : ""}
            </Badge>
          ) : null}
        </div>

        {missingRequiredFields.length > 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
            {copy.missingRequiredFieldsPrefix}
            {missingRequiredFields.map((field) => field.label).join(", ")}
          </div>
        ) : null}

        {shouldShowPairingGuide ? (
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-amber-300/40 bg-amber-500/5 px-3 py-2">
            <div className="text-xs leading-5">{copy.pairingGuideText}</div>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                document.getElementById(pairingSectionId)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              {copy.goToPairingAction}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">{copy.runtimeStatusTitle}</div>
            <div className="text-muted-foreground text-xs">
              {copy.runtimeStatusDescription}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void refetchRuntime();
            }}
            disabled={runtimeLoading}
          >
            {runtimeLoading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
            {copy.refreshAction}
          </Button>
        </div>

        {runtimeErrorMessage ? <InlineError error={runtimeErrorMessage} /> : null}

        {runtimeStatus ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={runtimeStatus.running ? "default" : "secondary"}>
              {runtimeStatus.running ? copy.runningLabel : copy.stoppedLabel}
            </Badge>
            <Badge variant={runtimeStatus.connected ? "default" : "secondary"}>
              {runtimeStatus.connected ? copy.connectedLabel : copy.disconnectedLabel}
            </Badge>
            <Badge variant="outline">
              {copy.activeUsersLabel}: {runtimeStatus.active_users}
            </Badge>
            {runtimeStatus.last_error ? (
              <Badge variant="destructive" className="max-w-full truncate">
                <AlertCircleIcon className="mr-1 size-3" />
                {runtimeStatus.last_error}
              </Badge>
            ) : null}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">{copy.noRuntimeStatus}</div>
        )}
      </section>

      <section id={pairingSectionId} className="space-y-4 rounded-lg border p-4">
        <div className="space-y-1">
          <div className="text-sm font-medium">{copy.pairSectionTitle}</div>
          <div className="text-muted-foreground text-xs">{copy.pairSectionDescription}</div>
        </div>

        <div className="grid items-stretch gap-4 xl:grid-cols-[340px_1fr]">
          <PairCodeBlock
            platform={platform}
            pairCommandLabel={pairCommandLabel}
            copy={copy}
          />

          <div className="grid h-full gap-4 xl:grid-rows-2">
            <section className="flex h-full min-h-0 flex-col space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{copy.pendingPairRequestsTitle}</div>
                <Badge variant="secondary">{pendingRequests.length}</Badge>
              </div>
              {pendingLoading ? (
                <div className="text-muted-foreground text-sm">{copy.loadingLabel}</div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
                  {copy.noPendingRequests}
                </div>
              ) : (
                <div className="min-h-0 space-y-2 overflow-auto pr-1">
                  {pendingRequests.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {item.external_user_name ?? item.external_user_id}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {formatConversationType(item.conversation_type, copy)} · {copy.requestedAtLabel}:{" "}
                            {formatDateTime(item.created_at, locale, copy.unknownTimeLabel)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={rejectPairRequest.isPending || approvePairRequest.isPending}
                            onClick={() => {
                              void rejectPairRequest
                                .mutateAsync({
                                  requestId: item.id,
                                  payload: {
                                    handled_by: "ui",
                                    workspace_id: SINGLE_WORKSPACE_ID,
                                  },
                                })
                                .then(() => toast.success(copy.rejectedToast))
                                .catch((error) => {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : copy.rejectFailedToast,
                                  );
                                });
                            }}
                          >
                            <XCircleIcon className="size-4" />
                            {copy.rejectAction}
                          </Button>
                          <Button
                            size="sm"
                            disabled={rejectPairRequest.isPending || approvePairRequest.isPending}
                            onClick={() => {
                              void approvePairRequest
                                .mutateAsync({
                                  requestId: item.id,
                                  payload: {
                                    handled_by: "ui",
                                    workspace_id: SINGLE_WORKSPACE_ID,
                                  },
                                })
                                .then(() => toast.success(copy.approvedToast))
                                .catch((error) => {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : copy.approveFailedToast,
                                  );
                                });
                            }}
                          >
                            <CheckCircle2Icon className="size-4" />
                            {copy.approveAction}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="flex h-full min-h-0 flex-col space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{copy.authorizedUsersTitle}</div>
                <Badge variant="secondary">{authorizedUsers.length}</Badge>
              </div>
              {usersLoading ? (
                <div className="text-muted-foreground text-sm">{copy.loadingLabel}</div>
              ) : authorizedUsers.length === 0 ? (
                <div className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
                  {copy.noAuthorizedUsers}
                </div>
              ) : (
                <div className="min-h-0 space-y-2 overflow-auto pr-1">
                  {authorizedUsers.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/70 p-3 shadow-sm"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="truncate text-sm font-medium">
                          {item.external_user_name ?? item.external_user_id}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatConversationType(item.conversation_type, copy)} · {copy.grantedAtLabel}:{" "}
                          {formatDateTime(item.granted_at, locale, copy.unknownTimeLabel)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline" className="rounded-full px-2 py-0.5">
                            {copy.sessionOverrideBadge}
                          </Badge>
                          <SessionSummaryBadges
                            items={describeSessionConfig(item.session_override, copy)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingAuthorizedUser(item);
                            setAuthorizedUserSessionForm(
                              sessionConfigToFormState(item.session_override),
                            );
                          }}
                        >
                          {copy.sessionOverrideAction}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={revokeAuthorizedUser.isPending}
                          onClick={() => {
                            const displayName = item.external_user_name ?? item.external_user_id;
                            const confirmed = window.confirm(
                              copy.revokeConfirmTemplate.replaceAll("{name}", displayName),
                            );
                            if (!confirmed) {
                              return;
                            }
                            void revokeAuthorizedUser
                              .mutateAsync(item.id)
                              .then(() => toast.success(copy.authorizationRevokedToast))
                              .catch((error) => {
                                toast.error(
                                  error instanceof Error ? error.message : copy.revokeFailedToast,
                                );
                              });
                          }}
                        >
                          <UnplugIcon className="size-4" />
                          {copy.revokeAction}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>

      <Dialog
        open={editingAuthorizedUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAuthorizedUser(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{copy.sessionOverrideDialogTitle}</DialogTitle>
            <DialogDescription>{copy.sessionOverrideDialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-sm font-medium">
                {editingAuthorizedUser?.external_user_name
                  ?? editingAuthorizedUser?.external_user_id
                  ?? "-"}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                {copy.sessionOverrideCurrentLabel}
              </div>
              <div className="mt-2">
                <SessionSummaryBadges
                  items={describeSessionConfig(editingAuthorizedUser?.session_override, copy)}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.sessionAssistantIdLabel}</div>
                <Input
                  value={authorizedUserSessionForm.assistant_id}
                  onChange={(event) =>
                    setAuthorizedUserSessionForm((current) => ({
                      ...current,
                      assistant_id: event.target.value,
                    }))
                  }
                  placeholder={copy.sessionAssistantIdPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.sessionRecursionLimitLabel}</div>
                <Input
                  value={authorizedUserSessionForm.recursion_limit}
                  onChange={(event) =>
                    setAuthorizedUserSessionForm((current) => ({
                      ...current,
                      recursion_limit: event.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                  inputMode="numeric"
                  placeholder={copy.sessionRecursionLimitPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.sessionThinkingLabel}</div>
                <SessionBooleanSelect
                  value={authorizedUserSessionForm.thinking_enabled}
                  onValueChange={(value) =>
                    setAuthorizedUserSessionForm((current) => ({
                      ...current,
                      thinking_enabled: value,
                    }))
                  }
                  copy={copy}
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.sessionPlanModeLabel}</div>
                <SessionBooleanSelect
                  value={authorizedUserSessionForm.is_plan_mode}
                  onValueChange={(value) =>
                    setAuthorizedUserSessionForm((current) => ({
                      ...current,
                      is_plan_mode: value,
                    }))
                  }
                  copy={copy}
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.sessionSubagentLabel}</div>
                <SessionBooleanSelect
                  value={authorizedUserSessionForm.subagent_enabled}
                  onValueChange={(value) =>
                    setAuthorizedUserSessionForm((current) => ({
                      ...current,
                      subagent_enabled: value,
                    }))
                  }
                  copy={copy}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={updateAuthorizedUserSessionOverride.isPending}
              onClick={() => {
                setAuthorizedUserSessionForm(DEFAULT_SESSION_FORM_STATE);
              }}
            >
              {copy.sessionResetAction}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingAuthorizedUser(null)}
              disabled={updateAuthorizedUserSessionOverride.isPending}
            >
              {copy.cancelAction}
            </Button>
            <Button
              type="button"
              disabled={
                editingAuthorizedUser == null
                || updateAuthorizedUserSessionOverride.isPending
              }
              onClick={() => {
                if (editingAuthorizedUser == null) {
                  return;
                }
                void updateAuthorizedUserSessionOverride
                  .mutateAsync({
                    userId: editingAuthorizedUser.id,
                    payload: sessionFormToConfig(authorizedUserSessionForm) ?? {},
                  })
                  .then(() => {
                    toast.success(copy.sessionOverrideSavedToast);
                    setEditingAuthorizedUser(null);
                  })
                  .catch((error) => {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : copy.sessionOverrideSaveFailedToast,
                    );
                  });
              }}
            >
              {updateAuthorizedUserSessionOverride.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ShieldCheckIcon className="size-4" />
              )}
              {copy.saveAndApplyAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ChannelSettingsPage() {
  const { t } = useI18n();
  const [platform, setPlatform] = useState<ChannelPlatform>("lark");

  const copy = useMemo(
    () => ({
      ...FALLBACK_COPY,
      title: t.settings.channels?.title ?? FALLBACK_COPY.title,
      description: t.settings.channels?.description ?? FALLBACK_COPY.description,
      workspaceDescription:
        t.workspace.singleWorkspaceHint ?? FALLBACK_COPY.workspaceDescription,
    }),
    [t.settings.channels, t.workspace.singleWorkspaceHint],
  );

  return (
    <SettingsSection title={copy.title} description={copy.description}>
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed bg-muted/20 p-4">
          <div className="text-sm font-medium">{copy.workspaceTitle}</div>
          <div className="text-muted-foreground mt-1 text-xs leading-5">
            {copy.workspaceDescription}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{t.workspace.singleWorkspaceLabel}</Badge>
            <Badge variant="outline">{t.workspace.singleWorkspacePath}</Badge>
          </div>
        </div>

        <Tabs
          value={platform}
          onValueChange={(value) => setPlatform(value as ChannelPlatform)}
        >
          <TabsList variant="line">
            <TabsTrigger value="lark">{copy.platformLark}</TabsTrigger>
            <TabsTrigger value="dingtalk">{copy.platformDingTalk}</TabsTrigger>
            <TabsTrigger value="telegram">{copy.platformTelegram}</TabsTrigger>
          </TabsList>
        </Tabs>

        <ChannelPlatformPanel key={platform} platform={platform} copy={copy} />
      </div>
    </SettingsSection>
  );
}
