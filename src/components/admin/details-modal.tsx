"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";
import { CopyableValue } from "./copyable-value";

export interface DetailItem {
  label: string;
  value: string;
  copy?: boolean;
  wide?: boolean;
}

export function DetailsModal({
  title,
  triggerLabel,
  closeLabel,
  copyLabels,
  items
}: {
  title: string;
  triggerLabel: string;
  closeLabel: string;
  copyLabels: Pick<Dictionary["common"], "copy" | "copied">;
  items: DetailItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="btn-secondary min-h-8 px-2 text-xs" type="button" onClick={() => setIsOpen(true)}>
        <Eye className="size-3.5" aria-hidden="true" />
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsOpen(false)}>
          <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
            <div className="flex items-start justify-between gap-4 border-b p-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-lg font-black text-[var(--foreground)]">{title}</h3>
              <button className="btn-secondary min-h-8 px-2" type="button" onClick={() => setIsOpen(false)} title={closeLabel}>
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">{closeLabel}</span>
              </button>
            </div>

            <dl className="grid gap-3 p-4 sm:grid-cols-2">
              {items.map((item) => (
                <div key={item.label} className={item.wide ? "sm:col-span-2" : undefined}>
                  <dt className="label">{item.label}</dt>
                  <dd className="m-0 break-words text-sm text-[var(--foreground)]">
                    {item.copy ? <CopyableValue value={item.value} labels={copyLabels} compact /> : item.value || "-"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      ) : null}
    </>
  );
}
