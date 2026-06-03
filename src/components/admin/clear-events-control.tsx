"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, X } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";

export function ClearEventsControl({
  labels,
  common
}: {
  labels: Dictionary["dashboard"];
  common: Dictionary["common"];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [mode, setMode] = useState<"olderThan" | "all">("olderThan");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    const selectedMode = String(form.get("mode")) === "all" ? "all" : "olderThan";

    try {
      const response = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selectedMode === "all"
            ? { mode: "all" }
            : { mode: "olderThan", olderThanDays: form.get("olderThanDays") || 30 }
        )
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || labels.clearEventsError);
      }

      setMessage(labels.clearEventsSuccess.replace("{count}", String(payload.result?.deleted ?? 0)));
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : labels.clearEventsError);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button className="btn-danger" type="button" onClick={() => setIsOpen(true)}>
        <Trash2 className="size-4" aria-hidden="true" />
        {labels.clearEvents}
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsOpen(false)}>
          <section className="modal-panel modal-panel-sm" role="dialog" aria-modal="true" aria-label={labels.clearEventsTitle}>
            <div className="flex items-start justify-between gap-4 border-b p-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <h3 className="text-lg font-black text-[var(--foreground)]">{labels.clearEventsTitle}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{labels.clearEventsDescription}</p>
              </div>
              <button className="btn-secondary min-h-8 px-2" type="button" onClick={() => setIsOpen(false)} title={common.close}>
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">{common.close}</span>
              </button>
            </div>

            <form className="grid gap-3 p-4" onSubmit={submit}>
              <label>
                <span className="label">{labels.clearEventsScope}</span>
                <select className="field" name="mode" value={mode} onChange={(event) => setMode(event.target.value === "all" ? "all" : "olderThan")}>
                  <option value="olderThan">{labels.clearEventsOlderThan}</option>
                  <option value="all">{labels.clearEventsAll}</option>
                </select>
              </label>

              {mode === "olderThan" ? (
                <label>
                  <span className="label">{labels.clearEventsDays}</span>
                  <input className="field" name="olderThanDays" type="number" min={1} max={3650} defaultValue={30} />
                </label>
              ) : null}

              <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "color-mix(in srgb, var(--danger) 28%, var(--border))", background: "var(--danger-soft)", color: "var(--danger)" }}>
                {labels.clearEventsConfirm}
              </p>

              {message ? <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "color-mix(in srgb, var(--success) 34%, var(--border))", background: "var(--success-soft)", color: "var(--success)" }}>{message}</p> : null}
              {error ? <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "color-mix(in srgb, var(--danger) 34%, var(--border))", background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p> : null}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button className="btn-secondary" type="button" onClick={() => setIsOpen(false)}>
                  {common.cancel}
                </button>
                <button className="btn-danger" type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                  {labels.clearEvents}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
