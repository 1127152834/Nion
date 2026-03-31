"use client";

import {
  BookTextIcon,
  BotIcon,
  Clock3Icon,
  DatabaseIcon,
  FolderKanbanIcon,
  HeartPulseIcon,
  MessagesSquare,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isAutomationPath } from "@/core/automation/routing";
import { useI18n } from "@/core/i18n/hooks";
import {
  pathOfMemory,
  pathOfNotebook,
  pathOfSelfMaintenance,
} from "@/core/navigation/desktop-routes";

export function WorkspaceNavChatList() {
  const { t } = useI18n();
  const pathname = usePathname();
  const notebookPath = pathOfNotebook();
  const memoryPath = pathOfMemory();
  const selfMaintenancePath = pathOfSelfMaintenance();
  return (
    <SidebarGroup className="pt-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={pathname === "/workspace/chats"} asChild>
            <Link className="text-muted-foreground" href="/workspace/chats">
              <MessagesSquare />
              <span>{t.sidebar.chats}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/projects")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/projects">
              <FolderKanbanIcon />
              <span>{t.sidebar.projects}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/agents")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/agents">
              <BotIcon />
              <span>{t.sidebar.agents}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={isAutomationPath(pathname)} asChild>
            <Link className="text-muted-foreground" href="/workspace/automation">
              <Clock3Icon />
              <span>{t.sidebar.automation}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith(notebookPath)}
            asChild
          >
            <Link className="text-muted-foreground" href={notebookPath}>
              <BookTextIcon />
              <span>{t.sidebar.notebook}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith(memoryPath)}
            asChild
          >
            <Link className="text-muted-foreground" href={memoryPath}>
              <DatabaseIcon />
              <span>{t.sidebar.memory}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith(selfMaintenancePath)}
            asChild
          >
            <Link className="text-muted-foreground" href={selfMaintenancePath}>
              <HeartPulseIcon />
              <span>{t.sidebar.selfMaintenance}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
