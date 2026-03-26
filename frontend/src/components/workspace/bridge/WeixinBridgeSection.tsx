"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/core/i18n/hooks";

import {
  getBridgeClient,
  type WeixinBridgeAccount,
  type WeixinBridgeLoginSession,
} from "@/core/bridge/client";

export function WeixinBridgeSection() {
  const client = getBridgeClient();
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<WeixinBridgeAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loginSession, setLoginSession] = useState<WeixinBridgeLoginSession | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusLabels = {
    waiting: t.bridge.weixin.qrWaiting,
    scanned: t.bridge.weixin.qrScanned,
    confirmed: t.bridge.weixin.qrConfirmed,
    expired: t.bridge.weixin.qrExpired,
    failed: t.bridge.weixin.qrFailed,
  } satisfies Record<WeixinBridgeLoginSession["status"], string>;

  const loadAccounts = async () => {
    if (!client) {
      return;
    }
    setAccounts(await client.listWeixinAccounts());
  };

  useEffect(() => {
    if (!client) {
      return;
    }
    void loadAccounts();
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [client]);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const pollLogin = (sessionId: string) => {
    stopPolling();
    pollTimerRef.current = setInterval(() => {
      if (!client) {
        stopPolling();
        return;
      }
      void client.waitForWeixinLogin(sessionId).then(async (next) => {
        setLoginSession(next);
        if (next.status === "confirmed" || next.status === "failed" || next.status === "expired") {
          stopPolling();
          await loadAccounts();
        }
      });
    }, 3_000);
  };

  const startLogin = async () => {
    if (!client) {
      return;
    }
    setLoading(true);
    const session = await client.startWeixinLogin();
    setLoginSession(session);
    pollLogin(session.sessionId);
    setLoading(false);
  };

  const toggleAccount = async (accountId: string, enabled: boolean) => {
    if (!client) {
      return;
    }
    await client.setWeixinAccountEnabled(accountId, enabled);
    await loadAccounts();
  };

  const deleteAccount = async (accountId: string) => {
    if (!client) {
      return;
    }
    await client.deleteWeixinAccount(accountId);
    setDeleteTarget(null);
    await loadAccounts();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-lg border p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t.bridge.weixin.title}</h2>
          <p className="text-muted-foreground text-sm">{t.bridge.weixin.description}</p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button type="button" size="sm" onClick={() => void startLogin()} disabled={loading}>
            {t.bridge.weixin.addAccount}
          </Button>
          <div className="text-muted-foreground text-sm">
            {t.bridge.weixin.currentBindings}: {accounts.length}
          </div>
        </div>
      </section>

      {loginSession ? (
        <section className="rounded-lg border p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{t.bridge.weixin.qrLogin}</h3>
            <p className="text-muted-foreground text-xs">{statusLabels[loginSession.status]}</p>
          </div>

          {loginSession.qrImage ? (
            <div className="mt-4 flex justify-center rounded-md border bg-white p-4">
              <img src={loginSession.qrImage} alt={t.bridge.weixin.qrLogin} className="size-64" />
            </div>
          ) : null}

          {loginSession.error ? (
            <div className="mt-3 text-sm text-red-600">{loginSession.error}</div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t.bridge.weixin.accounts}</h3>
          <p className="text-muted-foreground text-xs">{t.bridge.weixin.accountsDesc}</p>
        </div>

        <div className="mt-4 space-y-3">
          {accounts.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed px-3 py-3 text-sm">
              {t.bridge.weixin.noAccounts}
            </div>
          ) : (
            accounts.map((account) => (
              <div key={account.accountId} className="rounded-md border px-3 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{account.name || account.accountId}</div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      {account.enabled
                        ? t.bridge.weixin.accountActive
                        : t.bridge.weixin.accountPaused}
                      {!account.hasToken ? ` · ${t.bridge.weixin.accountExpired}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={account.enabled}
                      onCheckedChange={(checked) => void toggleAccount(account.accountId, checked)}
                    />
                    {deleteTarget === account.accountId ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => void deleteAccount(account.accountId)}
                        >
                          {t.common.delete}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget(null)}
                        >
                          {t.common.cancel}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(account.accountId)}
                      >
                        {t.common.delete}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
