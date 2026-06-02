"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Loader2, Plus } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";

export function CreateLicenseForm({ labels, common }: { labels: Dictionary["forms"]; common: Dictionary["common"] }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setToken(null);
    setIsPending(true);

    const form = new FormData(event.currentTarget);
    const expiresAt = String(form.get("expiresAt") || "");

    try {
      const response = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: form.get("ownerName"),
          username: form.get("username") || null,
          token: form.get("token") || null,
          maxDevices: form.get("maxDevices") || 10,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || labels.createError);
      }

      setToken(payload.token);
      event.currentTarget.reset();
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error desconocido.");
    } finally {
      setIsPending(false);
    }
  }

  async function copyToken() {
    if (token) {
      await navigator.clipboard.writeText(token);
    }
  }

  return (
    <form onSubmit={submit} className="panel grid gap-3 p-4 lg:grid-cols-6">
      <label className="lg:col-span-2">
        <span className="label">{labels.owner}</span>
        <input className="field" name="ownerName" required />
      </label>

      <label>
        <span className="label">{labels.username}</span>
        <input className="field" name="username" />
      </label>

      <label>
        <span className="label">{labels.maxDevices}</span>
        <input className="field" name="maxDevices" type="number" min={1} max={100} defaultValue={10} />
      </label>

      <label>
        <span className="label">{labels.expires}</span>
        <input className="field" name="expiresAt" type="datetime-local" />
      </label>

      <label>
        <span className="label">{labels.customToken}</span>
        <input className="field" name="token" placeholder={common.optional} />
      </label>

      <div className="flex items-end">
        <button className="btn-primary w-full" type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {common.create}
        </button>
      </div>

      {token ? (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm lg:col-span-6" style={{ borderColor: "color-mix(in srgb, var(--success) 34%, var(--border))", background: "var(--success-soft)", color: "var(--success)" }}>
          <KeyRound className="size-4 shrink-0" aria-hidden="true" />
          <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap bg-transparent p-0">{token}</code>
          <button className="btn-success min-h-8 px-2 text-xs" type="button" onClick={copyToken}>
            <Copy className="size-3.5" aria-hidden="true" />
            {common.copy}
          </button>
        </div>
      ) : null}

      {error ? <p className="rounded-md border px-3 py-2 text-sm lg:col-span-6" style={{ borderColor: "color-mix(in srgb, var(--danger) 34%, var(--border))", background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p> : null}
    </form>
  );
}
