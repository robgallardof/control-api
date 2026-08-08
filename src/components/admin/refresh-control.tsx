"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

export interface RefreshLabels {
  refreshNow: string;
  refreshing: string;
}

export function RefreshControl({ labels }: { labels: RefreshLabels }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button className="btn-secondary min-h-9 px-2.5" type="button" onClick={refresh} disabled={isPending} title={labels.refreshNow}>
      <RefreshCw className={cn("size-4", isPending && "animate-spin")} aria-hidden="true" />
      {isPending ? labels.refreshing : labels.refreshNow}
    </button>
  );
}
