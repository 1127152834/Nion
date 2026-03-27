"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { BridgeSection } from "./BridgeSection";
import { DiscordBridgeSection } from "./DiscordBridgeSection";
import { FeishuBridgeSection } from "./FeishuBridgeSection";
import { QqBridgeSection } from "./QqBridgeSection";
import { TelegramBridgeSection } from "./TelegramBridgeSection";
import { WeixinBridgeSection } from "./WeixinBridgeSection";
import {
  ChatsCircle,
  ChatTeardrop,
  GameController,
  TelegramLogo,
  WifiHigh,
  useBridgeTranslation,
} from "./bridge-shared";

type Section = "bridge" | "telegram" | "feishu" | "discord" | "qq" | "weixin";

const sidebarItems = [
  { id: "bridge", icon: WifiHigh, labelKey: "bridge.title" },
  { id: "telegram", icon: TelegramLogo, labelKey: "bridge.telegramSettings" },
  { id: "feishu", icon: ChatTeardrop, labelKey: "bridge.feishuSettings" },
  { id: "discord", icon: GameController, labelKey: "bridge.discordSettings" },
  { id: "qq", icon: ChatsCircle, labelKey: "bridge.qqSettings" },
  { id: "weixin", icon: ChatTeardrop, labelKey: "bridge.weixinSettings" },
] as const;

function getSectionFromHash(): Section {
  if (typeof window === "undefined") {
    return "bridge";
  }
  const hash = window.location.hash.replace("#", "");
  if (sidebarItems.some((item) => item.id === hash)) {
    return hash as Section;
  }
  return "bridge";
}

function subscribeToHash(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function BridgeLayout() {
  const hashSection = useSyncExternalStore(
    subscribeToHash,
    getSectionFromHash,
    () => "bridge" as Section,
  );
  const [overrideSection, setOverrideSection] = useState<Section | null>(null);
  const activeSection = overrideSection ?? hashSection;
  const { t } = useBridgeTranslation();

  const handleSectionChange = useCallback((section: Section) => {
    setOverrideSection(section);
    window.history.replaceState(null, "", `/workspace/bridge#${section}`);
    queueMicrotask(() => setOverrideSection(null));
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border">
      <div className="border-b border-border/50 px-6 pb-4 pt-4">
        <h1 className="text-xl font-semibold">{t("bridge.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("bridge.description")}
        </p>
      </div>

      <div className="flex min-h-0 flex-1">
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
          {activeSection === "bridge" && <BridgeSection />}
          {activeSection === "telegram" && <TelegramBridgeSection />}
          {activeSection === "feishu" && <FeishuBridgeSection />}
          {activeSection === "discord" && <DiscordBridgeSection />}
          {activeSection === "qq" && <QqBridgeSection />}
          {activeSection === "weixin" && <WeixinBridgeSection />}
        </div>
      </div>
    </div>
  );
}
