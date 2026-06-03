"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, Search, X } from "lucide-react";

const MEXICO_TIME_ZONE = "America/Mexico_City";

export interface SearchableTableLabels {
  search: string;
  placeholder: string;
  results: string;
  noResults: string;
  dateFrom: string;
  dateTo: string;
  orderByDate: string;
  newestFirst: string;
  oldestFirst: string;
  clearFilters: string;
}

interface SearchableTableProps {
  children: ReactNode;
  labels: SearchableTableLabels;
}

export function SearchableTable({ children, labels }: SearchableTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateOrder, setDateOrder] = useState<"desc" | "asc">("desc");
  const [visibleRows, setVisibleRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const hasFilters = Boolean(query || dateFrom || dateTo || dateOrder !== "desc");

  useEffect(() => {
    const table = tableRef.current;
    const bodies = Array.from(table?.querySelectorAll<HTMLTableSectionElement>("tbody") ?? []);
    const normalizedQuery = normalize(query);
    const fromTime = dateInputToMexicoBoundary(dateFrom, "start");
    const toTime = dateInputToMexicoBoundary(dateTo, "end");
    let visible = 0;
    let total = 0;

    for (const body of bodies) {
      const rows = Array.from(body.querySelectorAll<HTMLTableRowElement>("tr"));
      const sortableRows = rows.filter((row) => readSortTime(row) !== undefined);
      if (sortableRows.length === rows.length) {
        rows.sort((a, b) => {
          const aTime = readSortTime(a) ?? 0;
          const bTime = readSortTime(b) ?? 0;
          return dateOrder === "asc" ? aTime - bTime : bTime - aTime;
        });
        for (const row of rows) body.append(row);
      }

      for (const row of rows) {
        total += 1;
        const matchesText = !normalizedQuery || normalize(row.textContent ?? "").includes(normalizedQuery);
        const matchesDate = matchesDateRange(row, fromTime, toTime);
        const matches = matchesText && matchesDate;
        row.hidden = !matches;
        if (matches) visible += 1;
      }
    }

    setVisibleRows(visible);
    setTotalRows(total);
  }, [query, dateFrom, dateTo, dateOrder, children]);

  const clearFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setDateOrder("desc");
  };

  return (
    <div className="panel table-panel">
      <div className="table-toolbar">
        <div className="table-filter-stack">
          <label className="table-search">
            <Search className="size-4" aria-hidden="true" />
            <span className="sr-only">{labels.search}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.placeholder}
              type="search"
            />
          </label>
          <div className="table-date-filters">
            <label className="table-date-filter">
              <CalendarDays className="size-4" aria-hidden="true" />
              <span>{labels.dateFrom}</span>
              <input value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} type="date" />
            </label>
            <label className="table-date-filter">
              <CalendarDays className="size-4" aria-hidden="true" />
              <span>{labels.dateTo}</span>
              <input value={dateTo} onChange={(event) => setDateTo(event.target.value)} type="date" />
            </label>
            <label className="table-date-filter">
              <span>{labels.orderByDate}</span>
              <select value={dateOrder} onChange={(event) => setDateOrder(event.target.value as "desc" | "asc")}>
                <option value="desc">{labels.newestFirst}</option>
                <option value="asc">{labels.oldestFirst}</option>
              </select>
            </label>
            {hasFilters ? (
              <button className="table-filter-clear" type="button" onClick={clearFilters}>
                <X className="size-4" aria-hidden="true" />
                {labels.clearFilters}
              </button>
            ) : null}
          </div>
        </div>
        <span className="table-result-count">
          {visibleRows}/{totalRows} {labels.results}
        </span>
      </div>
      <div ref={tableRef} className="table-scroll">
        <table className="data-table">{children}</table>
      </div>
      {query && visibleRows === 0 ? <div className="table-empty">{labels.noResults}</div> : null}
    </div>
  );
}

function matchesDateRange(row: HTMLTableRowElement, fromTime?: number, toTime?: number) {
  if (fromTime === undefined && toTime === undefined) return true;
  const dates = readFilterTimes(row);
  if (!dates.length) return false;
  return dates.some((time) => {
    if (fromTime !== undefined && time < fromTime) return false;
    if (toTime !== undefined && time > toTime) return false;
    return true;
  });
}

function readSortTime(row: HTMLTableRowElement) {
  const value = row.dataset.sortDate;
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : undefined;
}

function readFilterTimes(row: HTMLTableRowElement) {
  const raw = row.dataset.filterDates || row.dataset.sortDate || "";
  return raw
    .split("|")
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time));
}

function dateInputToMexicoBoundary(value: string, boundary: "start" | "end") {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return undefined;
  const hour = boundary === "end" ? 23 : 0;
  const minute = boundary === "end" ? 59 : 0;
  const second = boundary === "end" ? 59 : 0;
  const millisecond = boundary === "end" ? 999 : 0;
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  return naiveUtc - mexicoOffsetMs(naiveUtc);
}

function mexicoOffsetMs(utcMs: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MEXICO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(utcMs));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return zonedAsUtc - utcMs;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
