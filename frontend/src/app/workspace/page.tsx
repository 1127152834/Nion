"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { pathOfNewThread } from "@/core/threads/utils";

export default function WorkspacePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(pathOfNewThread());
  }, [router]);

  return null;
}
