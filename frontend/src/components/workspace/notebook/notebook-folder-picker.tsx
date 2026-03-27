"use client";

import { FolderIcon } from "lucide-react";
import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NotebookDirectoryOption } from "@/core/notebook/directories";
import { notebookThemeStyle } from "./notebook-theme";

type NotebookFolderPickerProps = {
  emptyLabel?: string;
  options: NotebookDirectoryOption[];
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
};

const ROOT_VALUE = "__root__";

export function NotebookFolderPicker({
  options,
  placeholder,
  value,
  onValueChange,
}: NotebookFolderPickerProps) {
  const selected = useMemo(
    () => options.find((option) => option.path === value) ?? null,
    [options, value],
  );

  return (
    <Select
      value={value || ROOT_VALUE}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === ROOT_VALUE ? "" : nextValue)
      }
    >
      <SelectTrigger
        className="h-11 w-full border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)] shadow-none hover:bg-[var(--notebook-hover)] focus-visible:ring-[var(--notebook-brand)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <FolderIcon className="size-4 shrink-0 text-[var(--notebook-soft-text)]" />
          <SelectValue placeholder={placeholder} />
        </span>
      </SelectTrigger>
      <SelectContent
        align="start"
        className="border-[var(--notebook-border)] bg-[var(--notebook-panel)] text-[var(--notebook-ink)]"
        position="popper"
        style={notebookThemeStyle}
      >
        {options.map((option) => (
          <SelectItem
            key={option.path || ROOT_VALUE}
            value={option.path || ROOT_VALUE}
            className="text-[var(--notebook-ink)]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
