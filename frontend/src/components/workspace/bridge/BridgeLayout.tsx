"use client";

import { useState } from "react";
import {
  BotIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  QrCodeIcon,
  SendIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

import { BridgeSection } from "./BridgeSection";
import { BridgeDiagnosticsSection } from "./BridgeDiagnosticsSection";
import { DiscordBridgeSection } from "./DiscordBridgeSection";
import { FeishuBridgeSection } from "./FeishuBridgeSection";
import { QqBridgeSection } from "./QqBridgeSection";
import { TelegramBridgeSection } from "./TelegramBridgeSection";
import { WeixinBridgeSection } from "./WeixinBridgeSection";

type Section = "bridge" | "diagnostics" | "telegram" | "feishu" | "discord" | "qq" | "weixin";

const sidebarItems: Array<{
  id: Section;
  label: string;
  icon: typeof BotIcon;
}> = [
  { id: "bridge", label: "Bridge", icon: BotIcon },
  { id: "diagnostics", label: "Diagnostics", icon: BotIcon },
  { id: "telegram", label: "Telegram", icon: SendIcon },
  { id: "feishu", label: "Feishu", icon: MessageSquareIcon },
  { id: "discord", label: "Discord", icon: MessagesSquareIcon },
  { id: "qq", label: "QQ", icon: MessageCircleIcon },
  { id: "weixin", label: "Weixin", icon: QrCodeIcon },
];

export function BridgeLayout() {
  const [activeSection, setActiveSection] = useState<Section>("bridge");
  const { t } = useI18n();

  const labels: Record<Section, string> = {
    bridge: t.bridge.nav.overview,
    diagnostics: t.bridge.nav.diagnostics,
    telegram: t.bridge.nav.telegram,
    feishu: t.bridge.nav.feishu,
    discord: t.bridge.nav.discord,
    qq: t.bridge.nav.qq,
    weixin: t.bridge.nav.weixin,
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">{t.bridge.overview.title}</h1>
        <p className="text-muted-foreground text-sm">
          {t.bridge.overview.description}
        </p>
      </div>

      <div className="flex min-h-[520px]">
        <nav className="w-52 shrink-0 border-r p-3">
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full justify-start gap-3",
                  activeSection === item.id && "bg-accent text-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {labels[item.id]}
              </Button>
            ))}
          </div>
        </nav>

        <div className="flex-1 p-6">
          {activeSection === "bridge" && <BridgeSection />}
          {activeSection === "diagnostics" && (
            <BridgeDiagnosticsSection bridgeAvailable />
          )}
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
