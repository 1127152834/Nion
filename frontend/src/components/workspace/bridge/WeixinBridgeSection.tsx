"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle,
  Code,
  Plus,
  SpinnerGap,
  Trash,
  Warning,
} from "@/components/ui/icon";
import { SettingsCard } from "@/components/patterns/SettingsCard";
import { StatusBanner } from "@/components/patterns/StatusBanner";
import { createBridgeClient, type WeixinBridgeAccount } from "@/core/bridge/client";

import { normalizeQrImageSrc, useBridgeTranslation } from "./bridge-shared";

export function WeixinBridgeSection() {
  const { t } = useBridgeTranslation();
  const [accounts, setAccounts] = useState<WeixinBridgeAccount[]>([]);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState("");
  const [qrBridgeError, setQrBridgeError] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAccounts = useCallback(async () => {
    const client = createBridgeClient();
    setAccounts(await client.listWeixinAccounts());
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const formatToastMessage = useCallback((fallback: string, detail?: string) => {
    return detail ? `${fallback}: ${detail}` : fallback;
  }, []);

  const handleToggleAccount = async (accountId: string, enabled: boolean) => {
    try {
      const client = createBridgeClient();
      const result = await client.setWeixinAccountEnabled(accountId, enabled);
      if (!result.ok) {
        if (result.accountUpdated) {
          await fetchAccounts();
          toast.warning(formatToastMessage(t("weixin.accountUpdateSavedRestartFailed"), result.error));
          return;
        }
        toast.error(result.error || t("weixin.accountUpdateFailed"));
        return;
      }
      await fetchAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("weixin.accountUpdateFailed"));
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const client = createBridgeClient();
      const result = await client.deleteWeixinAccount(accountId);
      if (!result.ok) {
        if (result.accountDeleted) {
          setDeleteConfirm(null);
          await fetchAccounts();
          toast.warning(
            formatToastMessage(t("weixin.accountDeleteSavedRestartFailed"), result.error),
          );
          return;
        }
        toast.error(result.error || t("weixin.accountDeleteFailed"));
        return;
      }

      setDeleteConfirm(null);
      await fetchAccounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("weixin.accountDeleteFailed"));
    }
  };

  const cancelQrLogin = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setQrImage(null);
    setQrSessionId(null);
    setQrStatus("");
    setQrBridgeError(null);
  };

  const pollQrStatus = useCallback(
    async (sessionId: string) => {
      try {
        const client = createBridgeClient();
        const session = await client.waitForWeixinLogin(sessionId);
        setQrStatus(session.status);
        setQrBridgeError(session.bridgeRestartError || null);

        if (session.qrImage && session.status === "waiting") {
          setQrImage(session.qrImage);
        }

        if (session.status === "confirmed" || session.status === "failed") {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }

          if (session.status === "confirmed") {
            await fetchAccounts();
            if (session.bridgeRestartError) {
              toast.warning(
                formatToastMessage(
                  t("weixin.qrConfirmedRestartFailed"),
                  session.bridgeRestartError,
                ),
              );
            } else {
              setTimeout(() => {
                setQrImage(null);
                setQrSessionId(null);
                setQrStatus("");
                setQrBridgeError(null);
              }, 2000);
            }
          } else if (session.error) {
            toast.error(session.error);
          }
        }
      } catch {
        // ignore transient polling errors
      }
    },
    [fetchAccounts, formatToastMessage, t],
  );

  const startQrLogin = async () => {
    setQrLoading(true);
    setQrStatus("");
    setQrBridgeError(null);
    try {
      const client = createBridgeClient();
      const session = await client.startWeixinLogin();
      setQrImage(session.qrImage);
      setQrSessionId(session.sessionId);
      setQrStatus("waiting");

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      pollTimerRef.current = setInterval(() => {
        void pollQrStatus(session.sessionId);
      }, 3000);
    } catch (error) {
      setQrStatus("failed");
      toast.error(error instanceof Error ? error.message : t("weixin.qrFailed"));
    } finally {
      setQrLoading(false);
    }
  };

  void qrSessionId;

  return (
    <div className="max-w-3xl space-y-6">
      <StatusBanner variant="warning" className="text-sm">
        <Warning size={16} className="mt-0.5 mr-2 shrink-0" />
        <span>{t("weixin.riskWarning")}</span>
      </StatusBanner>

      <SettingsCard title={t("weixin.accounts")} description={t("weixin.accountsDesc")}>
        {accounts.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">{t("weixin.noAccounts")}</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.accountId}
                className="flex items-center justify-between rounded-md border border-border/30 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {account.name || account.accountId}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {account.enabled ? t("weixin.accountActive") : t("weixin.accountPaused")}
                    {account.hasToken ? "" : ` · ${t("weixin.accountExpired")}`}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <Switch
                    checked={account.enabled}
                    onCheckedChange={(checked) =>
                      void handleToggleAccount(account.accountId, checked)
                    }
                  />
                  {deleteConfirm === account.accountId ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleDeleteAccount(account.accountId)}
                      >
                        {t("common.delete")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(account.accountId)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash size={14} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!qrImage ? (
          <Button size="sm" onClick={startQrLogin} disabled={qrLoading} className="mt-3">
            {qrLoading ? (
              <SpinnerGap size={14} className="mr-1.5 animate-spin" />
            ) : (
              <Plus size={14} className="mr-1.5" />
            )}
            {t("weixin.addAccount")}
          </Button>
        ) : (
          <div className="mt-3 space-y-3 rounded-md border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Code size={16} />
                {t("weixin.qrLogin")}
              </h3>
              <Button size="sm" variant="ghost" onClick={cancelQrLogin}>
                {t("common.cancel")}
              </Button>
            </div>

            <div className="flex justify-center">
              <img
                src={normalizeQrImageSrc(qrImage)}
                alt="WeChat QR Code"
                className="h-48 w-48 rounded-md border border-border/30"
              />
            </div>

            <div className="text-center">
              {qrStatus === "waiting" ? (
                <StatusBanner variant="info">
                  <SpinnerGap size={14} className="mr-1.5 inline animate-spin" />
                  {t("weixin.qrWaiting")}
                </StatusBanner>
              ) : null}
              {qrStatus === "scanned" ? (
                <StatusBanner variant="info">
                  <CheckCircle size={14} className="text-primary mr-1.5 inline" />
                  {t("weixin.qrScanned")}
                </StatusBanner>
              ) : null}
              {qrStatus === "confirmed" ? (
                <StatusBanner variant="success">
                  <CheckCircle size={14} className="mr-1.5 inline" />
                  {t("weixin.qrConfirmed")}
                </StatusBanner>
              ) : null}
              {qrStatus === "expired" ? (
                <StatusBanner variant="warning">
                  <Warning size={14} className="mr-1.5 inline" />
                  {t("weixin.qrExpired")}
                </StatusBanner>
              ) : null}
              {qrStatus === "failed" ? (
                <StatusBanner variant="error">
                  <Warning size={14} className="mr-1.5 inline" />
                  {t("weixin.qrFailed")}
                </StatusBanner>
              ) : null}
              {qrBridgeError ? (
                <StatusBanner variant="warning" className="mt-2">
                  <Warning size={14} className="mr-1.5 inline" />
                  {formatToastMessage(t("weixin.qrConfirmedRestartFailed"), qrBridgeError)}
                </StatusBanner>
              ) : null}
            </div>
          </div>
        )}
      </SettingsCard>

      <SettingsCard title={t("weixin.setupGuide")}>
        <ol className="text-muted-foreground list-decimal list-inside space-y-2 text-sm">
          <li>{t("weixin.step1")}</li>
          <li>{t("weixin.step2")}</li>
          <li>{t("weixin.step3")}</li>
          <li>{t("weixin.step4")}</li>
          <li>{t("weixin.step5")}</li>
        </ol>
      </SettingsCard>
    </div>
  );
}
