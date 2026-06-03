"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";

export function BlockRuleForm({ labels, common }: { labels: Dictionary["forms"]; common: Dictionary["common"] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const form = new FormData(event.currentTarget);
    const expiresAt = String(form.get("expiresAt") || "");

    try {
      const response = await fetch("/api/admin/block-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.get("type"),
          value: form.get("value"),
          reason: form.get("reason") || null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || labels.blockError);
      }

      event.currentTarget.reset();
      router.refresh();
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : "Error desconocido.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel grid gap-3 p-4 lg:grid-cols-6">
      <label>
        <span className="label">{labels.blockType}</span>
        <select className="field" name="type" defaultValue="account">
          <option value="account">{labels.blockAccount}</option>
          <option value="device">{labels.blockDevice}</option>
          <option value="ip">{labels.blockIp}</option>
          <option value="country">{labels.blockCountry}</option>
          <option value="token">{labels.blockToken}</option>
          <option value="token_hash">{labels.blockTokenHash}</option>
          <option value="account_token">{labels.blockAccountToken}</option>
          <option value="account_token_hash">{labels.blockAccountTokenHash}</option>
        </select>
      </label>

      <label className="lg:col-span-2">
        <span className="label">{labels.blockValue}</span>
        <input className="field" name="value" required />
      </label>

      <label className="lg:col-span-2">
        <span className="label">{labels.blockReason}</span>
        <input className="field" name="reason" />
      </label>

      <label>
        <span className="label">{labels.blockExpires}</span>
        <input className="field" name="expiresAt" type="datetime-local" />
      </label>

      <div className="flex items-end">
        <button className="btn-danger w-full" type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Ban className="size-4" aria-hidden="true" />}
          {common.block}
        </button>
      </div>

      {error ? <p className="rounded-md border px-3 py-2 text-sm lg:col-span-6" style={{ borderColor: "color-mix(in srgb, var(--danger) 34%, var(--border))", background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p> : null}
    </form>
  );
}
