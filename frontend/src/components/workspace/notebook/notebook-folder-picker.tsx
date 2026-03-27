"use client";

import { CheckIcon, ChevronDownIcon, FolderIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { NotebookDirectoryOption } from "@/core/notebook/directories";

type NotebookFolderPickerProps = {
  emptyLabel: string;
  options: NotebookDirectoryOption[];
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
};

export function NotebookFolderPicker({
  emptyLabel,
  options,
  placeholder,
  value,
  onValueChange,
}: NotebookFolderPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const selected = useMemo(
    () => options.find((option) => option.path === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-controls={listId}
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-between rounded-md border border-[var(--notebook-border)] bg-[var(--notebook-panel)] px-3 text-left text-sm text-[var(--notebook-ink)] shadow-none transition-colors hover:bg-[var(--notebook-hover)]"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <FolderIcon className="size-4 shrink-0 text-[var(--notebook-soft-text)]" />
          <span className="truncate">
            {selected?.label || placeholder}
          </span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-[var(--notebook-soft-text)]" />
      </button>

      {open ? (
        <div
          id={listId}
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[var(--notebook-border)] bg-[var(--notebook-panel)] shadow-lg"
        >
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.path || "__root__"}
                    value={`${option.path} ${option.label}`}
                    onSelect={() => {
                      onValueChange(option.path);
                      setOpen(false);
                    }}
                  >
                    <FolderIcon className="size-4 text-[var(--notebook-soft-text)]" />
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.path === value ? (
                      <CheckIcon className="size-4 text-[var(--notebook-ink)]" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  );
}
