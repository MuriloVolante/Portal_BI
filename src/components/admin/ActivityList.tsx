"use client";

import { getPageIcon } from "@/lib/icons";
import { formatDateTimeBR } from "@/lib/utils";

export interface ActivityEntry {
  id: string;
  page_label: string;
  icon?: string | null;
  created_at: string;
}

/** Últimos dashboards abertos pelo usuário (dados de access_logs). */
export function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum acesso registrado ainda. Os acessos passam a ser gravados a cada dashboard aberto.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[rgb(70_70_70/.5)]">
      {entries.map((entry, i) => {
        const Icon = getPageIcon(entry.icon);
        return (
          <li
            key={entry.id}
            style={{ "--i": i } as React.CSSProperties}
            className="stagger flex items-center justify-between gap-3 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{entry.page_label}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-[13px] tabular-nums text-tertiary">
              {formatDateTimeBR(entry.created_at, "—")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
