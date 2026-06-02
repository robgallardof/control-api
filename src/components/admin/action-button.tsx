"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle, Loader2, Power, ShieldOff } from "lucide-react";
import { cn } from "@/lib/cn";

type ActionKind = "block" | "activate" | "expire" | "disable";

const icons = {
  block: Ban,
  activate: CheckCircle,
  expire: ShieldOff,
  disable: Power
};

export function ActionButton({
  endpoint,
  method = "PATCH",
  body,
  label,
  kind,
  confirmMessage
}: {
  endpoint: string;
  method?: "PATCH" | "POST";
  body: Record<string, unknown>;
  label: string;
  kind: ActionKind;
  confirmMessage?: string;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const Icon = icons[kind];

  async function runAction() {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo completar la acción.");
      }

      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Error desconocido.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        className={cn(
          "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-bold",
          kind === "activate" ? "btn-success min-h-8" : "btn-danger min-h-8"
        )}
        type="button"
        onClick={runAction}
        disabled={isPending}
        title={label}
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Icon className="size-3.5" aria-hidden="true" />}
        {label}
      </button>
      {error ? <span className="max-w-40 text-xs" style={{ color: "var(--danger)" }}>{error}</span> : null}
    </span>
  );
}
