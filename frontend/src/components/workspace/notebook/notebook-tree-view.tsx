"use client";

import { ChevronDownIcon, ChevronRightIcon, FileTextIcon, FolderIcon, MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { NotebookTreeNode } from "@/core/notebook";

type NotebookTreeViewProps = {
  activePath: string | null;
  noteTitleById: Map<string, string>;
  nodes: NotebookTreeNode[];
  onSelectNote: (noteId: string | null) => void;
};

export function NotebookTreeView({
  activePath,
  noteTitleById,
  nodes,
  onSelectNote,
}: NotebookTreeViewProps) {
  return (
    <>
      {nodes.map((node) => (
        <NotebookTreeItem
          key={node.path}
          activePath={activePath}
          node={node}
          noteTitleById={noteTitleById}
          onSelect={onSelectNote}
        />
      ))}
    </>
  );
}

function NotebookTreeItem({
  activePath,
  node,
  noteTitleById,
  onSelect,
}: {
  activePath: string | null;
  node: NotebookTreeNode;
  noteTitleById: Map<string, string>;
  onSelect: (noteId: string | null) => void;
}) {
  if (node.kind === "file") {
    const active = node.path === activePath;
    const title = node.note_id ? noteTitleById.get(node.note_id) ?? node.name : node.name;

    return (
      <button
        type="button"
        onClick={() => onSelect(node.note_id ?? null)}
        className={`group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${active ? "bg-[#EAEAE9] font-medium text-[#1A1A1A]" : "text-[#595959] hover:bg-[#F0F0F0]"}`}
      >
        <FileTextIcon className="size-3.5 shrink-0 text-[#8C8C8C]" />
        <div className="min-w-0">
          <div className="truncate">{title}</div>
        </div>
        <span className={`absolute right-2 hidden items-center pl-4 group-hover:flex ${active ? "bg-gradient-to-l from-[#EAEAE9] via-[#EAEAE9]" : "bg-gradient-to-l from-[#F9F9F8] via-[#F9F9F8]"}`}>
          <MoreHorizontalIcon className="size-4 text-[#8C8C8C]" />
        </span>
      </button>
    );
  }

  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#595959] transition-colors hover:bg-[#EAEAE9]">
        {open ? (
          <ChevronDownIcon className="size-3.5 text-[#8C8C8C]" />
        ) : (
          <ChevronRightIcon className="size-3.5 text-[#8C8C8C]" />
        )}
        <FolderIcon className="size-3.5 text-[#8C8C8C]" />
        <span className="truncate font-medium">{node.name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-0.5 space-y-0.5 pl-3">
        {node.children.map((child) => (
          <NotebookTreeItem
            key={child.path}
            activePath={activePath}
            node={child}
            noteTitleById={noteTitleById}
            onSelect={onSelect}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
