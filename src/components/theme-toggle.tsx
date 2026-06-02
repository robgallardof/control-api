"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/i18n/dictionaries";

const themeOptions = [
  { value: "light", icon: Sun, labelKey: "light" },
  { value: "dark", icon: Moon, labelKey: "dark" },
  { value: "system", icon: Laptop, labelKey: "system" }
] as const;

export function ThemeToggle({ labels }: { labels: Dictionary["common"] }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="segmented-control" aria-label={labels.theme}>
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const active = mounted && (theme || "system") === option.value;

        return (
          <button
            key={option.value}
            className={cn("segmented-button", active && "is-active")}
            type="button"
            onClick={() => setTheme(option.value)}
            title={labels[option.labelKey]}
            aria-pressed={active}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="sr-only">{labels[option.labelKey]}</span>
          </button>
        );
      })}
    </div>
  );
}
