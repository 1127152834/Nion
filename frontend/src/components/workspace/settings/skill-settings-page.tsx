"use client";

import { ChevronDownIcon, DownloadIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/core/i18n/hooks";
import { useDeleteSkill, useEnableSkill, useSkills } from "@/core/skills/hooks";
import type { Skill } from "@/core/skills/type";
import { pathOfNewThread } from "@/core/threads/utils";
import { env } from "@/env";

import { ConfirmActionDialog } from "./confirm-action-dialog";
import { SettingsSection } from "./settings-section";
import { SkillImportDialog } from "./skill-import-dialog";

export function SkillSettingsPage({ onClose }: { onClose?: () => void } = {}) {
  const { t } = useI18n();
  const { skills, isLoading, error } = useSkills();

  return (
    <SettingsSection
      title={t.settings.skills.title}
      description={t.settings.skills.description}
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div>{error instanceof Error ? error.message : "Failed to load skills"}</div>
      ) : (
        <SkillSettingsList skills={skills} onClose={onClose} />
      )}
    </SettingsSection>
  );
}

function SkillSettingsList({
  skills,
  onClose,
}: {
  skills: Skill[];
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const settingsLike = t.settings as {
    skillPage?: Record<string, string>;
  };
  const fallbackCopy = {
    createViaChat: "Create via chat",
    importFromAgents: "Import from agents",
    skillDeleted: "Skill deleted",
    deleteFailed: "Failed to delete skill",
    deleteConfirmTitle: "Delete skill",
    deleteConfirmDescription:
      'Delete skill "{name}"? This action cannot be undone.',
    cancelAction: "Cancel",
    confirmDeleteAction: "Delete",
  };
  const copy = {
    ...fallbackCopy,
    ...(settingsLike.skillPage ?? {}),
  };
  const router = useRouter();
  const [filter, setFilter] = useState<string>("public");
  const [pendingDeleteSkillName, setPendingDeleteSkillName] =
    useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { mutate: enableSkill } = useEnableSkill();
  const { mutate: deleteSkill, isPending: deletingSkill } = useDeleteSkill();

  const filteredSkills = useMemo(
    () => skills.filter((skill) => skill.category === filter),
    [skills, filter],
  );

  const handleCreateSkill = () => {
    onClose?.();
    router.push(`${pathOfNewThread()}?mode=skill`);
  };

  const handleConfirmDeleteSkill = () => {
    if (!pendingDeleteSkillName) {
      return;
    }
    deleteSkill(
      { skillName: pendingDeleteSkillName },
      {
        onSuccess: () => {
          toast.success(copy.skillDeleted);
          setPendingDeleteSkillName(null);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : copy.deleteFailed,
          );
        },
      },
    );
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex justify-between">
        <div className="flex gap-2">
          <Tabs defaultValue="public" onValueChange={setFilter}>
            <TabsList variant="line">
              <TabsTrigger value="public">{t.common.public}</TabsTrigger>
              <TabsTrigger value="custom">{t.common.custom}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <SparklesIcon className="size-4" />
                {t.settings.skills.createSkill}
                <ChevronDownIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={handleCreateSkill}>
                <SparklesIcon className="size-4 text-muted-foreground" />
                {copy.createViaChat}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setImportDialogOpen(true)}>
                <DownloadIcon className="size-4 text-muted-foreground" />
                {copy.importFromAgents}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {filteredSkills.length === 0 && (
        <EmptySkill onCreateSkill={handleCreateSkill} />
      )}

      {filteredSkills.length > 0 &&
        filteredSkills.map((skill) => (
          <Item className="w-full" variant="outline" key={skill.name}>
            <ItemContent>
              <ItemTitle>
                <div className="flex items-center gap-2">{skill.name}</div>
              </ItemTitle>
              <ItemDescription className="line-clamp-4">
                {skill.description}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Switch
                checked={skill.enabled}
                disabled={env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true"}
                onCheckedChange={(checked) =>
                  enableSkill({ skillName: skill.name, enabled: checked })
                }
              />
              {skill.category === "custom" && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-rose-600 hover:text-rose-600"
                  disabled={
                    env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ||
                    deletingSkill
                  }
                  onClick={() => {
                    setPendingDeleteSkillName(skill.name);
                  }}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              )}
            </ItemActions>
          </Item>
        ))}

      <ConfirmActionDialog
        open={pendingDeleteSkillName !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteSkillName(null);
          }
        }}
        title={copy.deleteConfirmTitle}
        description={copy.deleteConfirmDescription.replaceAll(
          "{name}",
          pendingDeleteSkillName ?? "",
        )}
        cancelText={copy.cancelAction}
        confirmText={copy.confirmDeleteAction}
        confirmDisabled={deletingSkill}
        onConfirm={handleConfirmDeleteSkill}
        confirmVariant="destructive"
      />

      <SkillImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}

function EmptySkill({ onCreateSkill }: { onCreateSkill: () => void }) {
  const { t } = useI18n();
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SparklesIcon />
        </EmptyMedia>
        <EmptyTitle>{t.settings.skills.emptyTitle}</EmptyTitle>
        <EmptyDescription>{t.settings.skills.emptyDescription}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreateSkill}>{t.settings.skills.emptyButton}</Button>
      </EmptyContent>
    </Empty>
  );
}
