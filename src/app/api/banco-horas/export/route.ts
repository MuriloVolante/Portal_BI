import { NextRequest, NextResponse } from "next/server";
import { checkPageAccess } from "@/lib/auth/pageAccess";
import { BANCO_HORAS_SLUG, parseBancoHorasFilters } from "@/lib/bancoHoras/filters";
import { fetchBancoHoras } from "@/lib/bancoHoras/source";
import { buildBancoHorasWorkbook } from "@/lib/bancoHoras/excel";
import { classifySqlError } from "@/lib/bancoHoras/errors";
import { logExportAttempt } from "@/lib/bancoHoras/audit";
import { sqlErrorResponse } from "@/lib/bancoHoras/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Consulta + planilha podem passar dos 10 s padrão em filtros amplos.
export const maxDuration = 60;

/**
 * GET /api/banco-horas/export?cargo=…&filial=…&gerencia=…&local=…&saldoMin=40
 * Valida sessão e permissão no painel Banco de Horas, consulta o SQL Server
 * (parametrizado) e devolve um .xlsx. Toda tentativa vai para export_logs.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  const access = await checkPageAccess(BANCO_HORAS_SLUG);

  if (!access.ok) {
    if (access.user) {
      await logExportAttempt({
        user_id: access.user.id,
        user_email: access.user.email ?? null,
        action: "export",
        status: "denied",
        filters: null,
        row_count: null,
        error_code: `HTTP_${access.status}`,
        error_detail: access.error,
        duration_ms: Date.now() - start,
      });
    }
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const parsed = parseBancoHorasFilters(request.nextUrl.searchParams);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { filters } = parsed;

  const audit = {
    user_id: access.user.id,
    user_email: access.user.email ?? null,
    action: "export" as const,
    filters,
  };

  let data: Awaited<ReturnType<typeof fetchBancoHoras>>;
  try {
    data = await fetchBancoHoras(filters);
  } catch (err) {
    const diagnosis = classifySqlError(err);
    await logExportAttempt({
      ...audit,
      status: "error",
      row_count: null,
      error_code: diagnosis.code,
      error_detail: diagnosis.detail,
      duration_ms: Date.now() - start,
    });
    return sqlErrorResponse(diagnosis, access.isAdmin);
  }

  if (!data.rows.length) {
    await logExportAttempt({
      ...audit,
      status: "empty",
      row_count: 0,
      error_code: null,
      error_detail: null,
      duration_ms: Date.now() - start,
    });
    return NextResponse.json({ error: "Nenhum colaborador encontrado com esses filtros." }, { status: 404 });
  }

  const file = await buildBancoHorasWorkbook({
    ...data,
    filters,
    generatedBy: access.user.email ?? "Portal BI",
  });

  await logExportAttempt({
    ...audit,
    status: "ok",
    row_count: data.rows.length,
    error_code: data.truncated ? "LIMITADO" : null,
    error_detail: null,
    duration_ms: Date.now() - start,
  });

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="banco-horas_${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
