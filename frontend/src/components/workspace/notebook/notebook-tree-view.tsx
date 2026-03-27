"use client";

import {
  ChevronDownIcon,
  ChevronRightIcon,
  FilePlus2Icon,
  FileTextIcon,
  FolderIcon,
  FolderPenIcon,
  FolderPlusIcon,
  FolderXIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotebookTreeNode } from "@/core/notebook";

type NotebookTreeViewProps = {
  activePath: string | null;
  copy: {
    createNoteHere: string;
    createSubfolder: string;
    deleteFolder: string;
    renameFolder: string;
  };
  noteTitleById: Map<string, string>;
  nodes: NotebookTreeNode[];
  onCreateNoteInDirectory: (directory: string) => void;
  onCreateSubfolder: (directory: string) => void;
  onDeleteDirectory: (directory: string) => void;
  onRenameDirectory: (directory: string) => void;
  onSelectNote: (noteId: string | null) => void;
};

export function NotebookTreeView({
  activePath,
  copy,
  noteTitleById,
  nodes,
  onCreateNoteInDirectory,
  onCreateSubfolder,
  onDeleteDirectory,
  onRenameDirectory,
  onSelectNote,
}: NotebookTreeViewProps) {
  return (
    <>
      {nodes.map((node) => (
        <NotebookTreeItem
          key={node.path}
          activePath={activePath}
          copy={copy}
          node={node}
          noteTitleById={noteTitleById}
          onCreateNoteInDirectory={onCreateNoteInDirectory}
          onCreateSubfolder={onCreateSubfolder}
          onDeleteDirectory={onDeleteDirectory}
          onRenameDirectory={onRenameDirectory}
          onSelect={onSelectNote}
        />
      ))}
    </>
  );
}

function NotebookTreeItem({
  activePath,
  copy,
  node,
  noteTitleById,
  onCreateNoteInDirectory,
  onCreateSubfolder,
  onDeleteDirectory,
  onRenameDirectory,
  onSelect,
}: {
  activePath: string | null;
  copy: NotebookTreeViewProps["copy"];
  node: NotebookTreeNode;
  noteTitleById: Map<string, string>;
  onCreateNoteInDirectory: (directory: string) => void;
  onCreateSubfolder: (directory: string) => void;
  onDeleteDirectory: (directory: string) => void;
  onRenameDirectory: (directory: string) => void;
  onSelect: (noteId: string | null) => void;
}) {
  if (node.kind === "file") {
    const active = node.path === activePath;
    const title = node.note_id ? noteTitleById.get(node.note_id) ?? node.name : node.name;

    return (
      <button
        type="button"
        onClick={() => onSelect(node.note_id ?? null)}
        className={`group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${active ? "bg-[var(--notebook-active)] font-medium text-[var(--notebook-ink)]" : "text-[var(--notebook-soft-text)] hover:bg-[var(--notebook-hover)]"}`}
      >
        <FileTextIcon className="size-3.5 shrink-0 text-[var(--notebook-soft-text)]" />
        <div className="min-w-0">
          <div className="truncate">{title}</div>
        </div>
        <span className="absolute right-2 hidden items-center pl-4 group-hover:flex">
          <MoreHorizontalIcon className="size-4 text-[var(--notebook-soft-text)]" />
        </span>
      </button>
    );
  }

  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="group flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--notebook-hover)]">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm text-[var(--notebook-soft-text)]">
          {open ? (
            <ChevronDownIcon className="size-3.5 text-[var(--notebook-soft-text)]" />
          ) : (
            <ChevronRightIcon className="size-3.5 text-[var(--notebook-soft-text)]" />
          )}
          <FolderIcon className="size-3.5 text-[var(--notebook-soft-text)]" />
          <span className="truncate font-medium">{node.name}</span>
        </CollapsibleTrigger>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`rounded p-1 text-[var(--notebook-soft-text)] transition-all duration-200 hover:bg-[var(--notebook-muted)] hover:text-[var(--notebook-ink)] ${menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"}`}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontalIcon className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
            <DropdownMenuItem onSelect={() => onCreateNoteInDirectory(node.path)}>
              <FilePlus2Icon className="size-4" />
              <span>{copy.createNoteHere}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCreateSubfolder(node.path)}>
              <FolderPlusIcon className="size-4" />
              <span>{copy.createSubfolder}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRenameDirectory(node.path)}>
              <FolderPenIcon className="size-4" />
              <span>{copy.renameFolder}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDeleteDirectory(node.path)}>
              <FolderXIcon className="size-4" />
              <span>{copy.deleteFolder}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CollapsibleContent className="mt-0.5 space-y-0.5 pl-3">
        {node.children.map((child) => (
          <NotebookTreeItem
            key={child.path}
            activePath={activePath}
            copy={copy}
            node={child}
            noteTitleById={noteTitleById}
            onCreateNoteInDirectory={onCreateNoteInDirectory}
            onCreateSubfolder={onCreateSubfolder}
            onDeleteDirectory={onDeleteDirectory}
            onRenameDirectory={onRenameDirectory}
            onSelect={onSelect}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
