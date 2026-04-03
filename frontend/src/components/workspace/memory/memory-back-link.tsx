"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function MemoryBackLink(props: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={props.href}
      className={cn(
        "group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        props.className,
      )}
    >
      <ArrowLeftIcon className="size-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" />
      <span>{props.label}</span>
    </Link>
  );
}
