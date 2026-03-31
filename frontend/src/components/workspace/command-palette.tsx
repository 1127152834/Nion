"use client";

import {
  ActivityIcon,
  BookTextIcon,
  DatabaseIcon,
  FolderKanbanIcon,
  HeartPulseIcon,
  KeyboardIcon,
  MessageSquarePlusIcon,
  SettingsIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/core/i18n/hooks";
import {
  pathOfMemory,
  pathOfNotebook,
  pathOfProjects,
  pathOfSelfMaintenance,
} from "@/core/navigation/desktop-routes";
import { pathOfNewThread } from "@/core/threads/utils";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";

import { SettingsDialog } from "./settings";

export function CommandPalette() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const notebookPath = pathOfNotebook();
  const memoryPath = pathOfMemory();
  const selfMaintenancePath = pathOfSelfMaintenance();
  const projectsPath = pathOfProjects();

  const handleNewChat = useCallback(() => {
    router.push(pathOfNewThread());
    setOpen(false);
  }, [router]);

  const handleOpenSettings = useCallback(() => {
    setOpen(false);
    setSettingsOpen(true);
  }, []);

  const handleShowShortcuts = useCallback(() => {
    setOpen(false);
    setShortcutsOpen(true);
  }, []);

  const handleOpenBridge = useCallback(() => {
    router.push("/workspace/bridge");
    setOpen(false);
  }, [router]);

  const handleOpenNotebook = useCallback(() => {
    router.push(notebookPath);
    setOpen(false);
  }, [notebookPath, router]);

  const handleOpenMemory = useCallback(() => {
    router.push(memoryPath);
    setOpen(false);
  }, [memoryPath, router]);

  const handleOpenSelfMaintenance = useCallback(() => {
    router.push(selfMaintenancePath);
    setOpen(false);
  }, [router, selfMaintenancePath]);

  const handleOpenProjects = useCallback(() => {
    router.push(projectsPath);
    setOpen(false);
  }, [projectsPath, router]);

  const shortcuts = useMemo(
    () => [
      { key: "k", meta: true, action: () => setOpen((o) => !o) },
      { key: "n", meta: true, shift: true, action: handleNewChat },
      { key: ",", meta: true, action: handleOpenSettings },
      { key: "/", meta: true, action: handleShowShortcuts },
    ],
    [handleNewChat, handleOpenSettings, handleShowShortcuts],
  );

  useGlobalShortcuts(shortcuts);

  const isMac =
    typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
  const metaKey = isMac ? "⌘" : "Ctrl+";
  const shiftKey = isMac ? "⇧" : "Shift+";

  return (
    <>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t.shortcuts.searchActions} />
        <CommandList>
          <CommandEmpty>{t.shortcuts.noResults}</CommandEmpty>
          <CommandGroup heading={t.shortcuts.actions}>
            <CommandItem onSelect={handleNewChat}>
              <MessageSquarePlusIcon className="mr-2 h-4 w-4" />
              {t.sidebar.newChat}
              <CommandShortcut>{metaKey}{shiftKey}N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={handleOpenSettings}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              {t.common.settings}
              <CommandShortcut>{metaKey},</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={handleOpenBridge}>
              <ActivityIcon className="mr-2 h-4 w-4" />
              {t.bridge.menuLabel}
            </CommandItem>
            <CommandItem onSelect={handleShowShortcuts}>
              <KeyboardIcon className="mr-2 h-4 w-4" />
              {t.shortcuts.keyboardShortcuts}
              <CommandShortcut>{metaKey}/</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading={t.shortcuts.navigation}>
            <CommandItem
              keywords={[t.shortcuts.openNotebook, t.sidebar.notebook]}
              onSelect={handleOpenNotebook}
            >
              <BookTextIcon className="mr-2 h-4 w-4" />
              {t.sidebar.notebook}
            </CommandItem>
            <CommandItem
              keywords={[t.shortcuts.openMemory, t.sidebar.memory]}
              onSelect={handleOpenMemory}
            >
              <DatabaseIcon className="mr-2 h-4 w-4" />
              {t.sidebar.memory}
            </CommandItem>
            <CommandItem
              keywords={[
                t.shortcuts.openSelfMaintenance,
                t.sidebar.selfMaintenance,
              ]}
              onSelect={handleOpenSelfMaintenance}
            >
              <HeartPulseIcon className="mr-2 h-4 w-4" />
              {t.sidebar.selfMaintenance}
            </CommandItem>
            <CommandItem
              keywords={[t.shortcuts.openProjects, t.sidebar.projects]}
              onSelect={handleOpenProjects}
            >
              <FolderKanbanIcon className="mr-2 h-4 w-4" />
              {t.sidebar.projects}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.shortcuts.keyboardShortcuts}</DialogTitle>
            <DialogDescription>
              {t.shortcuts.keyboardShortcutsDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {[
              { keys: `${metaKey}K`, label: t.shortcuts.openCommandPalette },
              { keys: `${metaKey}${shiftKey}N`, label: t.sidebar.newChat },
              { keys: `${metaKey}B`, label: t.shortcuts.toggleSidebar },
              { keys: "Palette", label: t.shortcuts.openNotebook },
              { keys: "Palette", label: t.shortcuts.openMemory },
              { keys: "Palette", label: t.shortcuts.openSelfMaintenance },
              { keys: "Palette", label: t.shortcuts.openProjects },
              { keys: `${metaKey},`, label: t.common.settings },
              { keys: "Palette", label: t.bridge.menuLabel },
              {
                keys: `${metaKey}/`,
                label: t.shortcuts.keyboardShortcuts,
              },
            ].map(({ keys, label }) => (
              <div key={keys} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <kbd className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-xs">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
