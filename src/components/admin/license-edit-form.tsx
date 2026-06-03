"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, X } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";

export interface EditableLicense {
  id: string;
  ownerName: string;
  username: string;
  status: string;
  maxDevices: number;
  expiresAt: string;
}

export function LicenseEditForm({
  license,
  labels,
  common
}: {
  license: EditableLicense;
  labels: Dictionary["dashboard"];
  common: Dictionary["common"];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const expiresAt = String(form.get("expiresAt") || "");

    try {
      const response = await fetch("/api/admin/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: license.id,
          ownerName: form.get("ownerName"),
          username: form.get("username") || null,
          status: form.get("status"),
          maxDevices: form.get("maxDevices"),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || labels.editLicenseError);
      }

      setIsOpen(false);
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : labels.editLicenseError);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button className="btn-secondary min-h-8 px-2 text-xs" type="button" onClick={() => setIsOpen(true)}>
        <Pencil className="size-3.5" aria-hidden="true" />
        {common.edit}
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsOpen(false)}>
          <section className="modal-panel modal-panel-sm" role="dialog" aria-modal="true" aria-label={labels.editLicenseTitle}>
            <div className="flex items-start justify-between gap-4 border-b p-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <h3 className="text-lg font-black text-[var(--foreground)]">{labels.editLicenseTitle}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{license.ownerName || license.id}</p>
              </div>
              <button className="btn-secondary min-h-8 px-2" type="button" onClick={() => setIsOpen(false)} title={common.close}>
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">{common.close}</span>
              </button>
            </div>

            <form className="grid gap-3 p-4" onSubmit={submit}>
              <label>
                <span className="label">{labels.owner}</span>
                <input className="field" name="ownerName" defaultValue={license.ownerName} required />
              </label>

              <label>
                <span className="label">{labels.user}</span>
                <input className="field" name="username" defaultValue={license.username} />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label">{labels.devicesShort}</span>
                  <input className="field" name="maxDevices" type="number" min={1} max={100} defaultValue={license.maxDevices || 1} required />
                </label>

                <label>
                  <span className="label">{common.status}</span>
                  <select className="field" name="status" defaultValue={license.status || "active"}>
                    <option value="active">{labels.statusActive}</option>
                    <option value="inactive">{labels.statusInactive}</option>
                    <option value="blocked">{labels.statusBlocked}</option>
                    <option value="expired">{labels.statusExpired}</option>
                  </select>
                </label>
              </div>

              <label>
                <span className="label">{labels.expires}</span>
                <input className="field" name="expiresAt" type="datetime-local" defaultValue={toDateTimeLocal(license.expiresAt)} />
              </label>

              {error ? <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "color-mix(in srgb, var(--danger) 34%, var(--border))", background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p> : null}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button className="btn-secondary" type="button" onClick={() => setIsOpen(false)}>
                  {common.cancel}
                </button>
                <button className="btn-primary" type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
                  {common.save}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function toDateTimeLocal(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
