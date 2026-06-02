"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE } from "@/i18n/constants";
import { cn } from "@/lib/cn";
import type { Dictionary, Locale } from "@/i18n/dictionaries";

export function LocaleToggle({ locale, labels }: { locale: Locale; labels: Dictionary["common"] }) {
  const router = useRouter();

  function setLocale(nextLocale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="segmented-control" aria-label={labels.language}>
      <Languages className="ml-2 size-4 text-[var(--muted)]" aria-hidden="true" />
      {(["es", "en"] as const).map((item) => (
        <button
          key={item}
          className={cn("segmented-button px-3 text-xs font-bold uppercase", locale === item && "is-active")}
          type="button"
          onClick={() => setLocale(item)}
          aria-pressed={locale === item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
