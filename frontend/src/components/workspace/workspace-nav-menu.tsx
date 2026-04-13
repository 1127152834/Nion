"use client";

import {
  ActivityIcon,
  BookTextIcon,
  ChevronsUpDown,
  DatabaseIcon,
  InfoIcon,
  Settings2Icon,
  SettingsIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/core/i18n/hooks";
import {
  pathOfMemory,
  pathOfKnowledge,
  pathOfNotebook,
} from "@/core/navigation/desktop-routes";

import { SettingsDialog } from "./settings";
import type { SettingsSection } from "./settings/settings-sections";

function NavMenuButtonContent({
  isSidebarOpen,
  t,
}: {
  isSidebarOpen: boolean;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return isSidebarOpen ? (
    <div className="text-muted-foreground flex w-full items-center gap-2 text-left text-sm">
      <SettingsIcon className="size-4" />
      <span>{t.workspace.navigationMenu}</span>
      <ChevronsUpDown className="text-muted-foreground ml-auto size-4" />
    </div>
  ) : (
    <div className="flex size-full items-center justify-center">
      <SettingsIcon className="text-muted-foreground size-4" />
    </div>
  );
}

export function WorkspaceNavMenu() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDefaultSection, setSettingsDefaultSection] =
    useState<SettingsSection>("appearance");
  const [mounted, setMounted] = useState(false);
  const { open: isSidebarOpen } = useSidebar();
  const { t } = useI18n();
  const router = useRouter();
  const notebookPath = pathOfNotebook();
  const knowledgePath = pathOfKnowledge();
  const memoryPath = pathOfMemory();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onOpenSettings = (event: Event) => {
      const customEvent = event as CustomEvent<{ section?: SettingsSection }>;
      setSettingsDefaultSection(customEvent.detail?.section ?? "appearance");
      setSettingsOpen(true);
    };
    window.addEventListener("nion-open-settings", onOpenSettings as EventListener);
    return () => {
      window.removeEventListener("nion-open-settings", onOpenSettings as EventListener);
    };
  }, []);

  return (
    <>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultSection={settingsDefaultSection}
      />
      <SidebarMenu className="w-full">
        <SidebarMenuItem>
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto"
                >
                  <NavMenuButtonContent isSidebarOpen={isSidebarOpen} t={t} />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      setSettingsOpen(false);
                      router.push(notebookPath);
                    }}
                  >
                    <BookTextIcon />
                    {t.sidebar.notebook}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSettingsOpen(false);
                      router.push(knowledgePath);
                    }}
                  >
                    <BookTextIcon />
                    {t.sidebar.knowledge}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSettingsOpen(false);
                      router.push(memoryPath);
                    }}
                  >
                    <DatabaseIcon />
                    {t.sidebar.memory}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      setSettingsDefaultSection("appearance");
                      setSettingsOpen(true);
                    }}
                  >
                    <Settings2Icon />
                    {t.common.settings}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSettingsOpen(false);
                    router.push("/workspace/bridge");
                  }}
                >
                  <ActivityIcon />
                  {t.bridge.menuLabel}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSettingsOpen(false);
                    router.push("/workspace/about");
                  }}
                >
                  <InfoIcon />
                  {t.workspace.about}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SidebarMenuButton
              size="lg"
              className="pointer-events-none group-data-[collapsible=icon]:mx-auto"
            >
              <NavMenuButtonContent isSidebarOpen={isSidebarOpen} t={t} />
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
