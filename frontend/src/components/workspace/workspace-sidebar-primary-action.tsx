"use client";

import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/core/i18n/hooks";
import { pathOfNewThread } from "@/core/threads/utils";
import { cn } from "@/lib/utils";

import { Tooltip } from "./tooltip";

export function WorkspaceSidebarPrimaryAction() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const href = pathOfNewThread();
  const isActive =
    pathname === "/workspace/chats" && searchParams.get("thread") === "new";

  const actionButton = (
    <Button
      asChild
      variant={isActive ? "default" : "outline"}
      size={isCollapsed ? "icon-sm" : "sm"}
      className={cn(
        "border-sidebar-border bg-background text-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isCollapsed ? "mx-auto" : "h-10 w-full justify-start rounded-2xl px-3.5",
      )}
    >
      <Link href={href}>
        <MessageSquarePlus className="size-4" />
        {isCollapsed ? (
          <span className="sr-only">{t.sidebar.newChat}</span>
        ) : (
          <span>{t.sidebar.newChat}</span>
        )}
      </Link>
    </Button>
  );

  return (
    <SidebarGroup className="pt-1 pb-0 group-data-[collapsible=icon]:px-0">
      <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        {isCollapsed ? (
          <Tooltip content={t.sidebar.newChat}>{actionButton}</Tooltip>
        ) : (
          actionButton
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
