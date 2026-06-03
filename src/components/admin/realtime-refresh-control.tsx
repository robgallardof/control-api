"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PauseCircle, PlayCircle, RefreshCw, Radio } from "lucide-react";
import { cn } from "@/lib/cn";

const MEXICO_TIME_ZONE = "America/Mexico_City";
const REFRESH_INTERVAL_MS = 8_000;

export interface RealtimeRefreshLabels {
  refreshNow: string;
  refreshing: string;
  autoRefreshOn: string;
  autoRefreshOff: string;
  pauseAutoRefresh: string;
  resumeAutoRefresh: string;
  lastRefresh: string;
}

export function RealtimeRefreshControl({
  labels,
  initialSyncedAt
}: {
  labels: RealtimeRefreshLabels;
  initialSyncedAt: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(initialSyncedAt);

  const lastSyncedLabel = useMemo(() => formatMexicoDateTime(lastSyncedAt), [lastSyncedAt]);

  const refresh = useCallback(() => {
    startTransition(() => {
      setLastSyncedAt(new Date().toISOString());
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    setLastSyncedAt(initialSyncedAt);
  }, [initialSyncedAt]);

  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [autoRefresh, refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [autoRefresh, refresh]);

  return (
    <div className="realtime-refresh-control" aria-live="polite">
      <div className="realtime-refresh-state">
        <span className={cn("live-dot", autoRefresh ? "is-live" : "is-paused")} aria-hidden="true" />
        <Radio className="size-4" aria-hidden="true" />
        <span>{autoRefresh ? labels.autoRefreshOn : labels.autoRefreshOff}</span>
      </div>
      <div className="realtime-refresh-meta">
        {labels.lastRefresh}: <b>{lastSyncedLabel}</b>
      </div>
      <div className="realtime-refresh-actions">
        <button className="btn-secondary min-h-9 px-2.5" type="button" onClick={refresh} disabled={isPending} title={labels.refreshNow}>
          <RefreshCw className={cn("size-4", isPending && "animate-spin")} aria-hidden="true" />
          {isPending ? labels.refreshing : labels.refreshNow}
        </button>
        <button
          className="btn-secondary min-h-9 px-2.5"
          type="button"
          onClick={() => setAutoRefresh((value) => !value)}
          title={autoRefresh ? labels.pauseAutoRefresh : labels.resumeAutoRefresh}
        >
          {autoRefresh ? <PauseCircle className="size-4" aria-hidden="true" /> : <PlayCircle className="size-4" aria-hidden="true" />}
          {autoRefresh ? labels.pauseAutoRefresh : labels.resumeAutoRefresh}
        </button>
      </div>
    </div>
  );
}

function formatMexicoDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: MEXICO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}
