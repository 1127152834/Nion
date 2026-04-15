"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { type BridgeRuntimeInfo, getBridgeClient } from "@/core/bridge/client";
import { cn } from "@/lib/utils";

import { WorkspacePageHeader } from "../workspace-page-header";

import { BridgeOverviewPanel } from "./BridgeOverviewPanel";
import {
  ChatsCircle,
  ChatTeardrop,
  GameController,
  TelegramLogo,
  useBridgeTranslation,
} from "./bridge-shared";
import { DiscordBridgeSection } from "./DiscordBridgeSection";
import { FeishuBridgeSection } from "./FeishuBridgeSection";
import { QqBridgeSection } from "./QqBridgeSection";
import { TelegramBridgeSection } from "./TelegramBridgeSection";
import { WeixinBridgeSection } from "./WeixinBridgeSection";

type Section = "telegram" | "feishu" | "discord" | "qq" | "weixin";

const sidebarItems = [
  { id: "telegram", icon: TelegramLogo, labelKey: "bridge.telegramSettings" },
  { id: "feishu", icon: ChatTeardrop, labelKey: "bridge.feishuSettings" },
  { id: "discord", icon: GameController, labelKey: "bridge.discordSettings" },
  { id: "qq", icon: ChatsCircle, labelKey: "bridge.qqSettings" },
  { id: "weixin", icon: ChatTeardrop, labelKey: "bridge.weixinSettings" },
] as const;

function getSectionFromHash(): Section {
  if (typeof window === "undefined") {
    return "telegram";
  }
  const hash = window.location.hash.replace("#", "");
  if (sidebarItems.some((item) => item.id === hash)) {
    return hash as Section;
  }
  return "telegram";
}

function subscribeToHash(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function BridgeLayout() {
  const hashSection = useSyncExternalStore(
    subscribeToHash,
    getSectionFromHash,
    () => "telegram" as Section,
  );
  const [overrideSection, setOverrideSection] = useState<Section | null>(null);
  const [runtimeInfo, setRuntimeInfo] = useState<BridgeRuntimeInfo | null>(null);
  const activeSection = overrideSection ?? hashSection;
  const { t } = useBridgeTranslation();
  const refreshRuntimeInfo = useCallback(async () => {
    try {
      const nextRuntimeInfo = await getBridgeClient()?.getRuntimeInfo();
      setRuntimeInfo(nextRuntimeInfo ?? null);
    } catch {
      setRuntimeInfo(null);
    }
  }, []);

  useEffect(() => {
    const loadRuntimeInfo = () => {
      void refreshRuntimeInfo();
    };
    const handleWindowFocus = () => {
      void loadRuntimeInfo();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadRuntimeInfo();
      }
    };

    void loadRuntimeInfo();
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshRuntimeInfo]);

  const handleSectionChange = useCallback((section: Section) => {
    setOverrideSection(section);
    window.history.replaceState(null, "", `/workspace/bridge#${section}`);
    queueMicrotask(() => setOverrideSection(null));
  }, []);

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <WorkspacePageHeader
        title={t("bridge.title")}
        description={t("bridge.description")}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-6 py-6">
          <div className="mb-6 rounded-2xl border border-border/60 bg-muted/30 p-5">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">
                {t("bridge.summaryTitle")}
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {t("bridge.summaryDescription")}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-foreground">
                {t("bridge.summarySameComputer")}
              </span>
              <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-foreground">
                {t("bridge.summarySameTasks")}
              </span>
              <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-foreground">
                {t("bridge.summarySameQueue")}
              </span>
            </div>
          </div>

          <BridgeOverviewPanel runtimeInfo={runtimeInfo} />

          <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background">
            <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border/50 p-3">
              {sidebarItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => handleSectionChange(item.id)}
                  className={cn(
                    "w-full justify-start gap-3 px-3 py-2 text-left text-sm font-medium",
                    activeSection === item.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {t(item.labelKey)}
                </Button>
              ))}
            </nav>

            <div className="flex-1 overflow-auto p-6">
              {activeSection === "telegram" && <TelegramBridgeSection />}
              {activeSection === "feishu" && <FeishuBridgeSection />}
              {activeSection === "discord" && <DiscordBridgeSection />}
              {activeSection === "qq" && <QqBridgeSection />}
              {activeSection === "weixin" && <WeixinBridgeSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
