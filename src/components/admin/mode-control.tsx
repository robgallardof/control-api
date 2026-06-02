"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/i18n/dictionaries";

const modes = [
  { value: "open", label: "Open" },
  { value: "soft", label: "Soft" },
  { value: "strict", label: "Strict" }
] as const;

export function ModeControl({ mode, labels }: { mode: "open" | "soft" | "strict"; labels: Dictionary["common"] }) {
  const [pendingMode, setPendingMode] = useState<string | null>(null);
  const router = useRouter();

  async function setMode(nextMode: string) {
    setPendingMode(nextMode);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode })
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar el modo.");
      }

      router.refresh();
    } finally {
      setPendingMode(null);
    }
  }

  return (
    <div className="segmented-control" aria-label={labels.status}>
      <ShieldCheck className="ml-2 size-4 text-[var(--accent)]" aria-hidden="true" />
      {modes.map((item) => (
        <button
          key={item.value}
          className={cn(
            "segmented-button px-3 text-xs font-bold uppercase",
            item.value === mode && "is-active"
          )}
          type="button"
          disabled={Boolean(pendingMode)}
          onClick={() => setMode(item.value)}
        >
          {pendingMode === item.value ? "..." : item.label}
        </button>
      ))}
    </div>
  );
}
