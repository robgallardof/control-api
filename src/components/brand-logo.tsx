import { cn } from "@/lib/cn";

export function BrandLogo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        className="size-11 shrink-0"
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-label="MultiArqqManager logo"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="10" fill="url(#mam-bg)" />
        <path d="M11 30.5V18.2C11 15.9 12.9 14 15.2 14H20L24 20L28 14H32.8C35.1 14 37 15.9 37 18.2V30.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 32H33" stroke="#B8FFF1" strokeWidth="3" strokeLinecap="round" />
        <circle cx="16" cy="35" r="2.6" fill="#B8FFF1" />
        <circle cx="24" cy="35" r="2.6" fill="white" />
        <circle cx="32" cy="35" r="2.6" fill="#D7E7FF" />
        <defs>
          <linearGradient id="mam-bg" x1="4" y1="6" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F766E" />
            <stop offset="0.48" stopColor="#2563EB" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
      </svg>
      {showText ? (
        <div className="min-w-0">
          <p className="truncate text-lg font-black tracking-normal text-[var(--foreground)]">MultiArqqManager</p>
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--muted)]">Control API</p>
        </div>
      ) : null}
    </div>
  );
}
