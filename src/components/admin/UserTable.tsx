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
import type { AdminUserRow } from "@/types";

interface UserTableProps {
  rows: AdminUserRow[];
  currentPage: number;
  hasNextPage: boolean;
}

export function UserTable({ rows, currentPage, hasNextPage }: UserTableProps) {
  return (
    <div className="space-y-4">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Páginas</TableHead>
              <TableHead className="pr-4 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="pl-4 font-medium">
                    {user.full_name ?? (
                      <span className="text-muted-foreground">Sem nome</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.banned ? "destructive" : "secondary"}>
                      {user.banned ? "desativado" : "ativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.page_count}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/usuarios/${user.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
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
        <span className="mr-2 text-sm text-muted-foreground">
          Página {currentPage}
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
        >
          <Link href={`/admin/usuarios?page=${currentPage - 1}`}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          className={!hasNextPage ? "pointer-events-none opacity-50" : ""}
        >
          <Link href={`/admin/usuarios?page=${currentPage + 1}`}>
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
