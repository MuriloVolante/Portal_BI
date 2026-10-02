import { NextResponse } from "next/server";
import { checkPageAccess } from "@/lib/auth/pageAccess";
import { BANCO_HORAS_SLUG } from "@/lib/bancoHoras/filters";
import { listBancoHorasOptions } from "@/lib/bancoHoras/source";
import { classifySqlError } from "@/lib/bancoHoras/errors";
import { logExportAttempt } from "@/lib/bancoHoras/audit";
import { sqlErrorResponse } from "@/lib/bancoHoras/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Opções das caixas de seleção (cargo, filial, gerência, local) do modal. */
export async function GET() {
  const access = await checkPageAccess(BANCO_HORAS_SLUG);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const start = Date.now();
  try {
    return NextResponse.json({ options: await listBancoHorasOptions() });
  } catch (err) {
    // Só falhas entram na auditoria: abrir o modal com sucesso não é evento.
    const diagnosis = classifySqlError(err);
    await logExportAttempt({
      user_id: access.user.id,
      user_email: access.user.email ?? null,
      action: "options",
      status: "error",
      filters: null,
      row_count: null,
      error_code: diagnosis.code,
      error_detail: diagnosis.detail,
      duration_ms: Date.now() - start,
    });
    return sqlErrorResponse(diagnosis, access.isAdmin);
  }
}
