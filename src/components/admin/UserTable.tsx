"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
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

interface UserTableProps {
  rows: AdminUserRow[];
  currentPage: number;
  hasNextPage: boolean;
}

export function UserTable({ rows, currentPage, hasNextPage }: UserTableProps) {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Nome</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden sm:table-cell">Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Painéis</TableHead>
              <TableHead className="hidden sm:table-cell">Último acesso</TableHead>
              <TableHead className="pr-5 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((user, i) => (
                <TableRow
                  key={user.id}
                  className="stagger"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <TableCell className="max-w-[220px] pl-5">
                    <p className={cn("truncate font-medium", !user.full_name && "text-muted-foreground")}>
                      {user.full_name ?? "Sem nome"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground lg:hidden">{user.email}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-tertiary sm:hidden">
                      Último acesso: {formatDateTimeBR(user.last_seen_at ?? user.last_sign_in_at)}
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
                    {/* Uso real (abertura de dashboard); antes do primeiro
                        registro, cai no último login do Auth */}
                    {formatDateTimeBR(user.last_seen_at ?? user.last_sign_in_at)}
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

      <div className="flex items-center justify-end gap-2">
        <span className="mr-2 text-sm text-muted-foreground">Página {currentPage}</span>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={currentPage <= 1 ? "pointer-events-none opacity-40" : ""}
        >
          <Link href={`/admin/usuarios?page=${currentPage - 1}`} aria-disabled={currentPage <= 1}>
            <ChevronLeft />
            Anterior
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={!hasNextPage ? "pointer-events-none opacity-40" : ""}
        >
          <Link href={`/admin/usuarios?page=${currentPage + 1}`} aria-disabled={!hasNextPage}>
            Próxima
            <ChevronRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
