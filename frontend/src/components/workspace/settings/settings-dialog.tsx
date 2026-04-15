"use client";

import {
  ActivityIcon,
  BellIcon,
  BrainIcon,
  BotIcon,
  PaletteIcon,
  PlugIcon,
  SearchIcon,
  SparklesIcon,
  SquareTerminalIcon,
  ShieldIcon,
  WrenchIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarGroupLabel } from "@/components/ui/sidebar";
import { AgentIntegrationsSettingsPage } from "@/components/workspace/settings/agent-integrations-settings-page";
import { AppearanceSettingsPage } from "@/components/workspace/settings/appearance-settings-page";
import { CLIToolsPage } from "@/components/workspace/settings/cli-tools-page";
import { DaemonSettingsPage } from "@/components/workspace/settings/daemon-settings-page";
import { IdentitySettingsPage } from "@/components/workspace/settings/identity-settings-page";
import { MCPServersPage } from "@/components/workspace/settings/mcp-servers-page";
import { MemorySettingsPage } from "@/components/workspace/settings/memory-settings-page";
import { ModelSettingsPage } from "@/components/workspace/settings/model-settings-page";
import { NotificationSettingsPage } from "@/components/workspace/settings/notification-settings-page";
import { RetrievalModelsSection } from "@/components/workspace/settings/retrieval-models-section";
import { SandboxSettingsPage } from "@/components/workspace/settings/sandbox-settings-page";
import { SearchSettingsPage } from "@/components/workspace/settings/search-settings-page";
import { SessionPolicySettingsPage } from "@/components/workspace/settings/session-policy-settings-page";
import { SkillSettingsPage } from "@/components/workspace/settings/skill-settings-page";
import { SoulSettingsPage } from "@/components/workspace/settings/soul-settings-page";
import { ToolSettingsPage } from "@/components/workspace/settings/tool-settings-page";
import { useConfigCenter } from "@/core/config-center";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

import { SettingsDialogProvider } from "./settings-dialog-context";
import { SETTINGS_SECTIONS, type SettingsSection } from "./settings-sections";

type SettingsDialogProps = React.ComponentProps<typeof Dialog> & {
  defaultSection?: SettingsSection;
};

type SettingsNavItem = {
  id: SettingsSection;
  label: string;
  icon: typeof PaletteIcon;
};

const SETTINGS_SECTION_SET = new Set<string>(SETTINGS_SECTIONS);

function SettingsNavGroupTitle({ title }: { title: string }) {
  return (
    <div className="space-y-1">
      <SidebarGroupLabel
        className={cn(
          "h-auto gap-0 rounded-none bg-transparent px-2 py-1",
          "text-[11px] font-semibold text-sidebar-foreground/60",
        )}
      >
        <span className="truncate">{title}</span>
      </SidebarGroupLabel>
      <div className="mx-2 h-px bg-sidebar-border/60" aria-hidden="true" />
    </div>
  );
}

export function SettingsDialog(props: SettingsDialogProps) {
  const { defaultSection = "appearance", ...dialogProps } = props;
  const { t } = useI18n();
  const resolvedDefaultSection = SETTINGS_SECTION_SET.has(defaultSection)
    ? defaultSection
    : "appearance";
  const [activeSection, setActiveSection] =
    useState<SettingsSection>(resolvedDefaultSection);
  const { isLoading: isConfigLoading } = useConfigCenter({
    enabled: dialogProps.open,
  });

  useEffect(() => {
    if (dialogProps.open) {
      setActiveSection(resolvedDefaultSection);
    }
  }, [dialogProps.open, resolvedDefaultSection]);

  const navGroups = useMemo(
    () => {
      const items: Record<SettingsSection, SettingsNavItem> = {
        appearance: {
          id: "appearance",
          label: t.settings.sections.appearance,
          icon: PaletteIcon,
        },
        notification: {
          id: "notification",
          label: t.settings.sections.notification,
          icon: BellIcon,
        },
        daemon: {
          id: "daemon",
          label: t.settings.sections.daemon,
          icon: ActivityIcon,
        },
        models: {
          id: "models",
          label: t.settings.sections.models,
          icon: BotIcon,
        },
        retrievalModels: {
          id: "retrievalModels",
          label: t.settings.sections.retrievalModels,
          icon: SparklesIcon,
        },
        sessionPolicy: {
          id: "sessionPolicy",
          label: t.settings.sections.sessionPolicy,
          icon: SparklesIcon,
        },
        memory: {
          id: "memory",
          label: t.settings.sections.memory,
          icon: BrainIcon,
        },
        identity: {
          id: "identity",
          label: t.settings.sections.identity,
          icon: SparklesIcon,
        },
        soul: {
          id: "soul",
          label: "Soul",
          icon: SparklesIcon,
        },
        tools: {
          id: "tools",
          label: t.settings.sections.tools,
          icon: WrenchIcon,
        },
        search: {
          id: "search",
          label: t.settings.sections.search,
          icon: SearchIcon,
        },
        cliTools: {
          id: "cliTools",
          label: t.settings.sections.cliTools,
          icon: SquareTerminalIcon,
        },
        agentIntegrations: {
          id: "agentIntegrations",
          label: t.settings.sections.agentIntegrations,
          icon: BotIcon,
        },
        mcpServers: {
          id: "mcpServers",
          label: t.settings.sections.mcpServers,
          icon: PlugIcon,
        },
        sandbox: {
          id: "sandbox",
          label: t.settings.sections.sandbox,
          icon: ShieldIcon,
        },
        skills: {
          id: "skills",
          label: t.settings.sections.skills,
          icon: SparklesIcon,
        },
      };

      return [
        {
          id: "experience",
          title: t.settings.navGroups.experience,
          items: [items.appearance, items.notification],
        },
        {
          id: "conversation",
          title: t.settings.navGroups.conversation,
          items: [items.models, items.retrievalModels, items.sessionPolicy],
        },
        {
          id: "knowledge",
          title: t.settings.navGroups.knowledge,
          items: [items.memory, items.identity, items.soul],
        },
        {
          id: "capabilities",
          title: t.settings.navGroups.capabilities,
          items: [
            items.tools,
            items.search,
            items.cliTools,
            items.agentIntegrations,
            items.mcpServers,
            items.skills,
          ],
        },
        {
          id: "system",
          title: t.settings.navGroups.system,
          items: [items.daemon, items.sandbox],
        },
      ];
    },
    [
      t.settings.sections.appearance,
      t.settings.sections.notification,
      t.settings.sections.daemon,
      t.settings.sections.models,
      t.settings.sections.retrievalModels,
      t.settings.sections.sessionPolicy,
      t.settings.sections.memory,
      t.settings.sections.identity,
      t.settings.sections.tools,
      t.settings.sections.search,
      t.settings.sections.cliTools,
      t.settings.sections.agentIntegrations,
      t.settings.sections.mcpServers,
      t.settings.sections.skills,
      t.settings.sections.sandbox,
      t.settings.navGroups.experience,
      t.settings.navGroups.conversation,
      t.settings.navGroups.knowledge,
      t.settings.navGroups.capabilities,
      t.settings.navGroups.system,
    ],
  );
  return (
    <Dialog
      {...dialogProps}
      onOpenChange={(open) => props.onOpenChange?.(open)}
    >
      <DialogContent
        className="flex h-[86vh] max-h-[calc(100vh-1rem)] flex-col sm:max-w-5xl md:max-w-6xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="gap-1">
          <DialogTitle>{t.settings.title}</DialogTitle>
          <p className="text-muted-foreground text-sm">
            {isConfigLoading
              ? t.settings.loadingState
              : t.settings.description}
          </p>
        </DialogHeader>
        <SettingsDialogProvider
          value={{
            activeSection,
            goToSection: (sectionId) => setActiveSection(sectionId),
          }}
        >
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[220px_1fr]">
            <nav className="bg-sidebar min-h-0 overflow-y-auto rounded-lg border border-sidebar-border p-2">
              <div className="space-y-2 pr-1">
                {navGroups.map((group) => (
                  <div key={group.id} className="space-y-1.5">
                    <SettingsNavGroupTitle title={group.title} />
                    <ul className="space-y-1">
                      {group.items.map(({ id, label, icon: Icon }) => {
                        const active = activeSection === id;
                        return (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => setActiveSection(id)}
                              className={cn(
                                "group flex w-full items-center gap-3 rounded-md border px-3 py-1.5 text-sm transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                active
                                  ? "border-sidebar-border bg-sidebar-accent font-semibold text-foreground"
                                  : "border-transparent text-muted-foreground hover:border-sidebar-border/70 hover:bg-sidebar-accent/50 hover:text-foreground",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "size-4 shrink-0",
                                  active
                                    ? "opacity-90"
                                    : "opacity-70 group-hover:opacity-90",
                                )}
                              />
                              <span className="truncate">{label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>
            <ScrollArea className="h-full min-h-0 rounded-lg border">
              <div className="space-y-8 p-6">
                {activeSection === "appearance" && <AppearanceSettingsPage />}
                {activeSection === "models" && <ModelSettingsPage />}
                {activeSection === "retrievalModels" && <RetrievalModelsSection />}
                {activeSection === "sessionPolicy" && (
                  <SessionPolicySettingsPage />
                )}
                {activeSection === "memory" && <MemorySettingsPage />}
                {activeSection === "identity" && <IdentitySettingsPage />}
                {activeSection === "soul" && <SoulSettingsPage />}
                {activeSection === "daemon" && <DaemonSettingsPage />}
                {activeSection === "tools" && <ToolSettingsPage />}
                {activeSection === "search" && <SearchSettingsPage />}
                {activeSection === "cliTools" && <CLIToolsPage />}
                {activeSection === "agentIntegrations" && (
                  <AgentIntegrationsSettingsPage />
                )}
                {activeSection === "mcpServers" && <MCPServersPage />}
                {activeSection === "skills" && (
                  <SkillSettingsPage
                    onClose={() => props.onOpenChange?.(false)}
                  />
                )}
                {activeSection === "sandbox" && <SandboxSettingsPage />}
                {activeSection === "notification" && (
                  <NotificationSettingsPage />
                )}
              </div>
            </ScrollArea>
          </div>
        </SettingsDialogProvider>
      </DialogContent>
    </Dialog>
  );
}
