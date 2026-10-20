"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { cn, formatDateTimeBR } from "@/lib/utils";
import type { AdminUserRow } from "@/types";

const PER_PAGE = 10;

type SortKey = "name" | "lastAccess";
type SortDir = "asc" | "desc";

/** Primeiro clique: nome de A a Z; último acesso do mais recente ao mais antigo. */
const FIRST_DIR: Record<SortKey, SortDir> = { name: "asc", lastAccess: "desc" };

const nameCollator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

/** Mesmo valor exibido na coluna: última vez no portal, ou o último login se nunca houve registro. */
function lastAccessOf(user: AdminUserRow) {
  return user.last_seen_at ?? user.last_sign_in_at;
}

function compareUsers(a: AdminUserRow, b: AdminUserRow, key: SortKey, dir: SortDir) {
  const sign = dir === "asc" ? 1 : -1;
  if (key === "name") {
    // Sem nome vai sempre para o fim, nas duas direções.
    if (!a.full_name || !b.full_name) return (a.full_name ? 0 : 1) - (b.full_name ? 0 : 1);
    return sign * nameCollator.compare(a.full_name, b.full_name);
  }
  const ta = lastAccessOf(a) ? new Date(lastAccessOf(a)!).getTime() : NaN;
  const tb = lastAccessOf(b) ? new Date(lastAccessOf(b)!).getTime() : NaN;
  // "Nunca" vai sempre para o fim, nas duas direções.
  if (Number.isNaN(ta) || Number.isNaN(tb)) return (Number.isNaN(ta) ? 1 : 0) - (Number.isNaN(tb) ? 1 : 0);
  return sign * (ta - tb);
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir } | null;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortHeader({ label, sortKey, sort, onSort, className }: SortHeaderProps) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "-mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active && "text-foreground"
        )}
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "opacity-50")} />
      </button>
    </TableHead>
  );
}

interface UserTableProps {
  rows: AdminUserRow[];
}

export function UserTable({ rows }: UserTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const sorted = useMemo(
    () => (sort ? [...rows].sort((a, b) => compareUsers(a, b, sort.key, sort.dir)) : rows),
    [rows, sort]
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const page = Math.min(currentPage, pageCount);
  const pageRows = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function handleSort(key: SortKey) {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: FIRST_DIR[key] }
    );
    setCurrentPage(1);
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Nome" sortKey="name" sort={sort} onSort={handleSort} className="pl-5" />
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden sm:table-cell">Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Painéis</TableHead>
              <SortHeader
                label="Último acesso"
                sortKey="lastAccess"
                sort={sort}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <TableHead className="pr-5 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((user, i) => (
                <TableRow
                  key={`${user.id}-${sort?.key ?? ""}-${sort?.dir ?? ""}`}
                  className="stagger"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <TableCell className="max-w-[220px] pl-5">
                    <p className={cn("truncate font-medium", !user.full_name && "text-muted-foreground")}>
                      {user.full_name ?? "Sem nome"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground lg:hidden">{user.email}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-tertiary sm:hidden">
                      Último acesso: {formatDateTimeBR(lastAccessOf(user))}
                    </p>
                  </TableCell>
                  <TableCell className="hidden max-w-[240px] truncate text-muted-foreground lg:table-cell">
                    {user.email}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={user.role === "admin" ? "default" : "info"}>
                      {user.role === "admin" ? "admin" : "usuário"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.banned ? "destructive" : "default"}>
                      {user.banned ? "desativado" : "ativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">{user.page_count}</TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                    {/* Última vez no portal (abertura ou retorno à aba); antes
                        do primeiro registro, cai no último login do Auth */}
                    {formatDateTimeBR(lastAccessOf(user))}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/usuarios/${user.id}`}>
                        <Pencil className="!size-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                        <span className="sr-only sm:hidden">Editar {user.full_name ?? user.email}</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="mr-2 text-sm text-muted-foreground">
            Página {page} de {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setCurrentPage(page - 1)}>
            <ChevronLeft />
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setCurrentPage(page + 1)}>
            Próxima
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
