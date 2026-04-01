"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FieldRow } from "@/components/patterns/FieldRow";
import { SettingsCard } from "@/components/patterns/SettingsCard";
import { StatusBanner } from "@/components/patterns/StatusBanner";
import { Button } from "@/components/ui/button";
import { CheckCircle, SpinnerGap, Warning } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createBridgeClient } from "@/core/bridge/client";
import { useBridgeConfigEditor } from "@/core/bridge-config";

import {
  BridgePlatformRuntimeCard,
  useBridgeTranslation,
} from "./useBridgeTranslation";

function SaveButton({
  dirty,
  saving,
  onClick,
  label,
  savedLabel,
}: {
  dirty: boolean;
  saving: boolean;
  onClick: () => void;
  label: string;
  savedLabel: string;
}) {
  return (
    <Button size="sm" onClick={onClick} disabled={saving || !dirty}>
      {saving ? (
        <>
          <SpinnerGap size={14} className="mr-1.5 animate-spin" />
          {label}
        </>
      ) : dirty ? (
        label
      ) : (
        savedLabel
      )}
    </Button>
  );
}

export function FeishuBridgeSection() {
  const { t } = useBridgeTranslation();
  const { bridgeConfig, refetchConfig, saveBridgeConfig } = useBridgeConfigEditor();

  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [domain, setDomain] = useState("feishu");
  const [credentialsSaving, setCredentialsSaving] = useState(false);
  const [credentialsDirty, setCredentialsDirty] = useState(false);
  const savedCredentials = useRef({ appId: "", appSecret: "", domain: "feishu" });

  const [allowFrom, setAllowFrom] = useState("");
  const [dmPolicy, setDmPolicy] = useState("open");
  const [threadSession, setThreadSession] = useState(false);
  const [groupPolicy, setGroupPolicy] = useState("open");
  const [groupAllowFrom, setGroupAllowFrom] = useState("");
  const [requireMention, setRequireMention] = useState(false);
  const [behaviorSaving, setBehaviorSaving] = useState(false);
  const [behaviorDirty, setBehaviorDirty] = useState(false);
  const savedBehavior = useRef({
    allowFrom: "",
    dmPolicy: "open",
    threadSession: false,
    groupPolicy: "open",
    groupAllowFrom: "",
    requireMention: false,
  });

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [bridgeEnabled, setBridgeEnabled] = useState(false);
  const [channelEnabled, setChannelEnabled] = useState(false);
  const [persistedVerified, setPersistedVerified] = useState(false);
  const connectionVerified =
    persistedVerified
    && !credentialsDirty
    && Boolean(appId)
    && Boolean(appSecret);

  useEffect(() => {
    const saved = savedCredentials.current;
    setCredentialsDirty(
      appId !== saved.appId || appSecret !== saved.appSecret || domain !== saved.domain,
    );
  }, [appId, appSecret, domain]);

  useEffect(() => {
    const saved = savedBehavior.current;
    setBehaviorDirty(
      allowFrom !== saved.allowFrom ||
        dmPolicy !== saved.dmPolicy ||
        threadSession !== saved.threadSession ||
        groupPolicy !== saved.groupPolicy ||
        groupAllowFrom !== saved.groupAllowFrom ||
        requireMention !== saved.requireMention,
    );
  }, [allowFrom, dmPolicy, threadSession, groupPolicy, groupAllowFrom, requireMention]);

  const fetchSettings = useCallback(async () => {
    const feishu =
      bridgeConfig.feishu;
    setBridgeEnabled(true);
    setChannelEnabled(feishu.enabled);
    setPersistedVerified(feishu.verified);

    setAppId(feishu.app_id);
    setAppSecret(feishu.app_secret);
    setDomain(feishu.domain || "feishu");
    setAllowFrom(feishu.allow_from);
    setDmPolicy(feishu.dm_policy || "open");
    setThreadSession(feishu.thread_session);
    setGroupPolicy(feishu.group_policy || "open");
    setGroupAllowFrom(feishu.group_allow_from);
    setRequireMention(feishu.require_mention);

    savedCredentials.current = {
      appId: feishu.app_id,
      appSecret: feishu.app_secret,
      domain: feishu.domain || "feishu",
    };
    savedBehavior.current = {
      allowFrom: feishu.allow_from,
      dmPolicy: feishu.dm_policy || "open",
      threadSession: feishu.thread_session,
      groupPolicy: feishu.group_policy || "open",
      groupAllowFrom: feishu.group_allow_from,
      requireMention: feishu.require_mention,
    };
    setCredentialsDirty(false);
    setBehaviorDirty(false);
  }, [bridgeConfig]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSaveCredentials = async () => {
    setCredentialsSaving(true);
    try {
      await saveBridgeConfig((current) => ({
        ...current,
        feishu: {
          ...current.feishu,
          app_id: appId,
          app_secret: appSecret,
          domain,
        },
      }));
      savedCredentials.current = { appId, appSecret, domain };
      setCredentialsDirty(false);
    } finally {
      setCredentialsSaving(false);
    }
  };

  const handleSaveBehavior = async () => {
    setBehaviorSaving(true);
    try {
      await saveBridgeConfig((current) => ({
        ...current,
        feishu: {
          ...current.feishu,
          allow_from: allowFrom,
          dm_policy: dmPolicy,
          thread_session: threadSession,
          group_policy: groupPolicy,
          group_allow_from: groupAllowFrom,
          require_mention: requireMention,
        },
      }));
      savedBehavior.current = {
        allowFrom,
        dmPolicy,
        threadSession,
        groupPolicy,
        groupAllowFrom,
        requireMention,
      };
      setBehaviorDirty(false);
    } finally {
      setBehaviorSaving(false);
    }
  };

  const handleVerify = async () => {
    await ensureFeishuVerifiedBeforeEnable();
  };

  const ensureFeishuVerifiedBeforeEnable = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      if (!appId) {
        setVerifyResult({ ok: false, message: t("feishu.enterCredentialsFirst") });
        return false;
      }

      const client = createBridgeClient();
      const result = await client.verifyFeishu({
        app_id: appId,
        app_secret: appSecret,
        domain,
      });

      if (result.verified) {
        setVerifyResult({
          ok: true,
          message: result.botName
            ? t("feishu.verifiedAs", { name: result.botName })
            : t("feishu.verified"),
        });
        setPersistedVerified(true);
        await refetchConfig();
        return true;
      }

      setVerifyResult({
        ok: false,
        message: result.error?.trim() ? result.error : t("feishu.verifyFailed"),
      });
      await refetchConfig();
      return false;
    } catch {
      setVerifyResult({ ok: false, message: t("feishu.verifyFailed") });
      await refetchConfig();
      return false;
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <BridgePlatformRuntimeCard
        platform="feishu"
        bridgeEnabled={bridgeEnabled}
        channelEnabled={channelEnabled}
        connectionVerified={connectionVerified}
        onEnableBeforeStart={async () => {
          const verified = await ensureFeishuVerifiedBeforeEnable();
          if (!verified) {
            return false;
          }
          const saved = await saveBridgeConfig((current) => ({
            ...current,
            feishu: {
              ...current.feishu,
              enabled: true,
            },
          }));
          if (!saved) {
            return false;
          }
          return true;
        }}
      />

      <SettingsCard title={t("feishu.credentials")} description={t("feishu.credentialsDesc")}>
        <div className="space-y-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              {t("feishu.appId")}
            </label>
            <Input
              value={appId}
              onChange={(event) => setAppId(event.target.value)}
              placeholder="cli_xxxxxxxxxx"
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              {t("feishu.appSecret")}
            </label>
            <Input
              type="password"
              value={appSecret}
              onChange={(event) => setAppSecret(event.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              {t("feishu.domain")}
            </label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feishu">{t("feishu.domainFeishu")}</SelectItem>
                <SelectItem value="lark">{t("feishu.domainLark")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground mt-1 text-xs">{t("feishu.domainHint")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SaveButton
            dirty={credentialsDirty}
            saving={credentialsSaving}
            onClick={() => void handleSaveCredentials()}
            label={t("common.save")}
            savedLabel={t("feishu.saved")}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleVerify()}
            disabled={verifying || !appId}
          >
            {verifying ? <SpinnerGap size={14} className="mr-1.5 animate-spin" /> : null}
            {t("feishu.verify")}
          </Button>
        </div>

        {verifyResult ? (
          <StatusBanner
            variant={verifyResult.ok ? "success" : "error"}
            icon={
              verifyResult.ok ? (
                <CheckCircle size={16} className="shrink-0" />
              ) : (
                <Warning size={16} className="shrink-0" />
              )
            }
          >
            {verifyResult.message}
          </StatusBanner>
        ) : null}
      </SettingsCard>

      <SettingsCard
        title={t("feishu.accessBehavior")}
        description={t("feishu.accessBehaviorDesc")}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              {t("feishu.dmPolicy")}
            </label>
            <Select value={dmPolicy} onValueChange={setDmPolicy}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">{t("feishu.dmPolicyOpen")}</SelectItem>
                <SelectItem value="pairing">{t("feishu.dmPolicyPairing")}</SelectItem>
                <SelectItem value="allowlist">{t("feishu.dmPolicyAllowlist")}</SelectItem>
                <SelectItem value="disabled">{t("feishu.dmPolicyDisabled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              {t("feishu.allowFrom")}
            </label>
            <Input
              value={allowFrom}
              onChange={(event) => setAllowFrom(event.target.value)}
              placeholder="*, ou_xxxxxxxxxx, ou_yyyyyyyyyy"
              className="font-mono text-sm"
            />
            <p className="text-muted-foreground mt-1 text-xs">{t("feishu.allowFromHint")}</p>
          </div>

          <div className="space-y-2 border-t pt-3">
            <label className="block text-xs font-semibold text-foreground">
              {t("feishu.groupPolicy")}
            </label>
            <Select value={groupPolicy} onValueChange={setGroupPolicy}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">{t("feishu.groupPolicyOpen")}</SelectItem>
                <SelectItem value="allowlist">{t("feishu.groupPolicyAllowlist")}</SelectItem>
                <SelectItem value="disabled">{t("feishu.groupPolicyDisabled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {groupPolicy === "allowlist" ? (
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                {t("feishu.groupAllowFrom")}
              </label>
              <Input
                value={groupAllowFrom}
                onChange={(event) => setGroupAllowFrom(event.target.value)}
                placeholder="oc_xxxxxxxxxx, oc_yyyyyyyyyy"
                className="font-mono text-sm"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {t("feishu.groupAllowFromHint")}
              </p>
            </div>
          ) : null}

          <div className="border-t pt-3">
            <FieldRow
              label={t("feishu.requireMention")}
              description={t("feishu.requireMentionDesc")}
            >
              <Switch checked={requireMention} onCheckedChange={setRequireMention} />
            </FieldRow>
          </div>

          <div className="border-t pt-3">
            <FieldRow
              label={t("feishu.threadSession")}
              description={t("feishu.threadSessionDesc")}
            >
              <Switch checked={threadSession} onCheckedChange={setThreadSession} />
            </FieldRow>
          </div>
        </div>

        <SaveButton
          dirty={behaviorDirty}
          saving={behaviorSaving}
          onClick={() => void handleSaveBehavior()}
          label={t("common.save")}
          savedLabel={t("feishu.saved")}
        />
      </SettingsCard>

      <SettingsCard title={t("feishu.setupGuide")}>
        <ol className="text-muted-foreground list-decimal space-y-1.5 pl-4 text-xs">
          <li>{t("feishu.step1")}</li>
          <li>{t("feishu.step2")}</li>
          <li>{t("feishu.step3")}</li>
          <li>{t("feishu.step4")}</li>
          <li>{t("feishu.step5")}</li>
          <li>{t("feishu.step6")}</li>
        </ol>
      </SettingsCard>
    </div>
  );
}
