"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle, Loader2, Power, ShieldOff, X } from "lucide-react";
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
  confirmMessage,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar"
}: {
  endpoint: string;
  method?: "PATCH" | "POST";
  body: Record<string, unknown>;
  label: string;
  kind: ActionKind;
  confirmMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const Icon = icons[kind];

  async function executeAction() {
    setIsConfirmOpen(false);
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

  function runAction() {
    if (confirmMessage) {
      setIsConfirmOpen(true);
      return;
    }

    void executeAction();
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
      {isConfirmOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsConfirmOpen(false)}>
          <section className="modal-panel modal-panel-sm" role="dialog" aria-modal="true" aria-label={label}>
            <div className="flex items-start justify-between gap-4 border-b p-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <h3 className="text-base font-black text-[var(--foreground)]">{label}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{confirmMessage}</p>
              </div>
              <button className="btn-secondary min-h-8 px-2" type="button" onClick={() => setIsConfirmOpen(false)} title={cancelLabel}>
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">{cancelLabel}</span>
              </button>
            </div>
            <div className="flex flex-wrap justify-end gap-2 p-4">
              <button className="btn-secondary" type="button" onClick={() => setIsConfirmOpen(false)}>
                {cancelLabel}
              </button>
              <button className={kind === "activate" ? "btn-success" : "btn-danger"} type="button" onClick={() => void executeAction()} disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
                {confirmLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </span>
  );
}
