"use client";

import { icons, LayoutDashboard } from "lucide-react";

export interface ActivityEntry {
  id: string;
  page_label: string;
  icon?: string | null;
  created_at: string;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Últimos dashboards abertos pelo usuário (dados de access_logs). */
export function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum acesso registrado ainda. Os acessos passam a ser gravados a
        cada dashboard aberto.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((entry) => {
        const Icon =
          (entry.icon && icons[entry.icon as keyof typeof icons]) ||
          LayoutDashboard;
        return (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {entry.page_label}
            </span>
            <span
              className="whitespace-nowrap text-sm text-muted-foreground"
              suppressHydrationWarning
            >
              {formatDateTime(entry.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
