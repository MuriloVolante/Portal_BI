import { NextRequest, NextResponse } from "next/server";
import { checkPageAccess } from "@/lib/auth/pageAccess";
import { BANCO_HORAS_SLUG, parseBancoHorasFilters } from "@/lib/bancoHoras/filters";
import { BancoHorasConfigError, fetchBancoHoras } from "@/lib/bancoHoras/source";
import { buildBancoHorasWorkbook } from "@/lib/bancoHoras/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Consulta + planilha podem passar dos 10 s padrão em filtros amplos.
export const maxDuration = 60;

/**
 * GET /api/banco-horas/export?saldoMin=40&gerencia=MANUTENÇÃO
 * Valida sessão e permissão no painel Banco de Horas, consulta o SQL Server
 * (parametrizado) e devolve um .xlsx para download.
 */
export async function GET(request: NextRequest) {
  const access = await checkPageAccess(BANCO_HORAS_SLUG);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = parseBancoHorasFilters(request.nextUrl.searchParams);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { filters } = parsed;

  let data: Awaited<ReturnType<typeof fetchBancoHoras>>;
  try {
    data = await fetchBancoHoras(filters);
  } catch (err) {
    console.error("[banco-horas] exportação:", err);
    const error =
      err instanceof BancoHorasConfigError
        ? "A conexão com o banco de horas ainda não foi configurada."
        : "Não foi possível consultar o banco de horas agora. Tente de novo em instantes.";
    return NextResponse.json({ error }, { status: 502 });
  }

  if (!data.rows.length) {
    return NextResponse.json(
      { error: "Nenhum colaborador encontrado com esses filtros." },
      { status: 404 }
    );
  }

  const file = await buildBancoHorasWorkbook({
    ...data,
    filters,
    generatedBy: access.user.email ?? "Portal BI",
  });

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const slugGerencia = filters.gerencia
    ? `_${filters.gerencia.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}`
    : "";
  const filename = `banco-horas${slugGerencia}_${today}.xlsx`;

  console.info(
    `[banco-horas] exportado por ${access.user.email}: ${data.rows.length} linhas`,
    JSON.stringify(filters)
  );

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
