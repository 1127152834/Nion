"use client";

import {
  ChevronDownIcon,
  ChevronRightIcon,
  GripVerticalIcon,
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
    deleteNote: string;
    moveNote: string;
    renameFolder: string;
    renameNote: string;
  };
  noteTitleById: Map<string, string>;
  nodes: NotebookTreeNode[];
  onCreateNoteInDirectory: (directory: string) => void;
  onCreateSubfolder: (directory: string) => void;
  onDeleteDirectory: (directory: string) => void;
  onDeleteNote: (noteId: string) => void;
  onMoveDirectoryToDirectory: (directory: string, parentDirectory: string) => void;
  onMoveNote: (noteId: string) => void;
  onMoveNoteToDirectory: (noteId: string, directory: string) => void;
  onMoveNodeToRoot: (payload: DragPayload) => void;
  onRenameDirectory: (directory: string) => void;
  onRenameNote: (noteId: string) => void;
  onSelectNote: (noteId: string | null) => void;
};

export type DragPayload =
  | { kind: "file"; noteId: string }
  | { kind: "directory"; path: string };

export function NotebookTreeView({
  activePath,
  copy,
  noteTitleById,
  nodes,
  onCreateNoteInDirectory,
  onCreateSubfolder,
  onDeleteDirectory,
  onDeleteNote,
  onMoveDirectoryToDirectory,
  onMoveNote,
  onMoveNoteToDirectory,
  onMoveNodeToRoot,
  onRenameDirectory,
  onRenameNote,
  onSelectNote,
}: NotebookTreeViewProps) {
  return (
    <div
      className="space-y-1"
      onDragOver={(event) => {
        const payload = readDragPayload(event.dataTransfer);
        if (!payload) {
          return;
        }
        event.preventDefault();
      }}
      onDrop={(event) => {
        const payload = readDragPayload(event.dataTransfer);
        if (!payload) {
          return;
        }
        event.preventDefault();
        onMoveNodeToRoot(payload);
      }}
    >
      <div className="rounded-md border border-dashed border-[var(--notebook-border)] px-2 py-1 text-[11px] text-[var(--notebook-soft-text)]">
        拖到这里移动到顶层
      </div>
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
          onDeleteNote={onDeleteNote}
          onMoveDirectoryToDirectory={onMoveDirectoryToDirectory}
          onMoveNote={onMoveNote}
          onMoveNoteToDirectory={onMoveNoteToDirectory}
          onMoveNodeToRoot={onMoveNodeToRoot}
          onRenameDirectory={onRenameDirectory}
          onRenameNote={onRenameNote}
          onSelect={onSelectNote}
        />
      ))}
    </div>
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
  onDeleteNote,
  onMoveDirectoryToDirectory,
  onMoveNote,
  onMoveNoteToDirectory,
  onMoveNodeToRoot,
  onRenameDirectory,
  onRenameNote,
  onSelect,
}: {
  activePath: string | null;
  copy: NotebookTreeViewProps["copy"];
  node: NotebookTreeNode;
  noteTitleById: Map<string, string>;
  onCreateNoteInDirectory: (directory: string) => void;
  onCreateSubfolder: (directory: string) => void;
  onDeleteDirectory: (directory: string) => void;
  onDeleteNote: (noteId: string) => void;
  onMoveDirectoryToDirectory: (directory: string, parentDirectory: string) => void;
  onMoveNote: (noteId: string) => void;
  onMoveNoteToDirectory: (noteId: string, directory: string) => void;
  onMoveNodeToRoot: (payload: DragPayload) => void;
  onRenameDirectory: (directory: string) => void;
  onRenameNote: (noteId: string) => void;
  onSelect: (noteId: string | null) => void;
}) {
  if (node.kind === "file") {
    const active = node.path === activePath;
    const title = node.note_id ? noteTitleById.get(node.note_id) ?? node.name : node.name;
    const [menuOpen, setMenuOpen] = useState(false);

    return (
      <div
        className={`group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${active ? "bg-[var(--notebook-active)] font-medium text-[var(--notebook-ink)]" : "text-[var(--notebook-soft-text)] hover:bg-[var(--notebook-hover)]"}`}
        draggable={Boolean(node.note_id)}
        onDragStart={(event) => {
          if (!node.note_id) {
            return;
          }
          writeDragPayload(event.dataTransfer, {
            kind: "file",
            noteId: node.note_id,
          });
        }}
      >
        <button
          type="button"
          onClick={() => onSelect(node.note_id ?? null)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <GripVerticalIcon className="size-3.5 shrink-0 text-[var(--notebook-soft-text)] opacity-0 transition-opacity group-hover:opacity-100" />
          <FileTextIcon className="size-3.5 shrink-0 text-[var(--notebook-soft-text)]" />
          <div className="min-w-0">
            <div className="truncate">{title}</div>
          </div>
        </button>
        {node.note_id ? (
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
              <DropdownMenuItem onSelect={() => onRenameNote(node.note_id!)}>
                <FolderPenIcon className="size-4" />
                <span>{copy.renameNote}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onMoveNote(node.note_id!)}>
                <FolderIcon className="size-4" />
                <span>{copy.moveNote}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDeleteNote(node.note_id!)}>
                <FolderXIcon className="size-4" />
                <span>{copy.deleteNote}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    );
  }

  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="group flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--notebook-hover)]">
        <CollapsibleTrigger
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm text-[var(--notebook-soft-text)]"
          draggable
          onDragStart={(event) => {
            writeDragPayload(event.dataTransfer, {
              kind: "directory",
              path: node.path,
            });
          }}
          onDragOver={(event) => {
            const payload = readDragPayload(event.dataTransfer);
            if (!payload) {
              return;
            }
            event.preventDefault();
          }}
          onDrop={(event) => {
            const payload = readDragPayload(event.dataTransfer);
            if (!payload) {
              return;
            }
            event.preventDefault();
            if (payload.kind === "file") {
              onMoveNoteToDirectory(payload.noteId, node.path);
              return;
            }
            if (payload.path !== node.path) {
              onMoveDirectoryToDirectory(payload.path, node.path);
            }
          }}
        >
          {open ? (
            <ChevronDownIcon className="size-3.5 text-[var(--notebook-soft-text)]" />
          ) : (
            <ChevronRightIcon className="size-3.5 text-[var(--notebook-soft-text)]" />
          )}
          <GripVerticalIcon className="size-3.5 text-[var(--notebook-soft-text)] opacity-0 transition-opacity group-hover:opacity-100" />
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
            onDeleteNote={onDeleteNote}
            onMoveDirectoryToDirectory={onMoveDirectoryToDirectory}
            onMoveNote={onMoveNote}
            onMoveNoteToDirectory={onMoveNoteToDirectory}
            onMoveNodeToRoot={onMoveNodeToRoot}
            onRenameDirectory={onRenameDirectory}
            onRenameNote={onRenameNote}
            onSelect={onSelect}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function writeDragPayload(dataTransfer: DataTransfer | null, payload: DragPayload) {
  if (!dataTransfer) {
    return;
  }
  dataTransfer.effectAllowed = "move";
  dataTransfer.setData("application/x-nion-notebook-node", JSON.stringify(payload));
}

function readDragPayload(dataTransfer: DataTransfer | null): DragPayload | null {
  if (!dataTransfer) {
    return null;
  }
  const raw = dataTransfer.getData("application/x-nion-notebook-node");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}
