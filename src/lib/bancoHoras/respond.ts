import "server-only";
import { NextResponse } from "next/server";
import type { SqlDiagnosis } from "./errors";

/**
 * Resposta de erro do SQL Server: todo mundo vê o que aconteceu e o código;
 * admin vê também o que fazer e o detalhe técnico.
 */
export function sqlErrorResponse(diagnosis: SqlDiagnosis, isAdmin: boolean) {
  return NextResponse.json(
    {
      error: diagnosis.title,
      code: diagnosis.code,
      ...(isAdmin ? { hint: diagnosis.hint, detail: diagnosis.detail } : {}),
    },
    { status: 502 }
  );
}
