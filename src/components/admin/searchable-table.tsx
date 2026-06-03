"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

interface SearchableTableProps {
  children: ReactNode;
  labels: {
    search: string;
    placeholder: string;
    results: string;
    noResults: string;
  };
}

export function SearchableTable({ children, labels }: SearchableTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [visibleRows, setVisibleRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => {
    const rows = Array.from(
      tableRef.current?.querySelectorAll<HTMLTableRowElement>("tbody tr") ?? []
    );
    const normalizedQuery = normalize(query);
    let visible = 0;

    for (const row of rows) {
      const matches = !normalizedQuery || normalize(row.textContent ?? "").includes(normalizedQuery);
      row.hidden = !matches;
      if (matches) visible += 1;
    }

    setVisibleRows(visible);
    setTotalRows(rows.length);
  }, [query, children]);

  return (
    <div className="panel table-panel">
      <div className="table-toolbar">
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

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
