"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";

export function CopyableValue({
  value,
  labels,
  compact = false
}: {
  value: string;
  labels: Pick<Dictionary["common"], "copy" | "copied">;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  if (!value) {
    return <span>-</span>;
  }

  return (
    <span className={compact ? "copyable-value compact" : "copyable-value"}>
      <code className={compact ? "token-code compact" : "token-code"}>{value}</code>
      <button className="btn-secondary min-h-8 shrink-0 px-2 text-xs" type="button" onClick={copy} title={copied ? labels.copied : labels.copy}>
        {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        <span className="sr-only">{copied ? labels.copied : labels.copy}</span>
      </button>
    </span>
  );
}
