import { NextResponse } from "next/server";
import { getSessionInfo } from "@/lib/auth/session";
import { runSqlDiagnostics } from "@/lib/bancoHoras/diagnostics";
import { logExportAttempt } from "@/lib/bancoHoras/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Teste de conexão com o SQL Server, etapa por etapa (só admin). */
export async function POST() {
  const session = await getSessionInfo();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.profile?.role !== "admin") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const start = Date.now();
  const report = await runSqlDiagnostics();

  await logExportAttempt({
    user_id: session.user.id,
    user_email: session.user.email ?? null,
    action: "diagnostic",
    status: report.ok ? "ok" : "error",
    filters: null,
    row_count: null,
    error_code: report.diagnosis?.code ?? null,
    error_detail: [
      report.diagnosis?.detail,
      `origem: ${report.origin.region} / IP ${report.origin.publicIp ?? "?"}`,
      ...report.steps.map((s) => `${s.id}=${s.status}${s.ms !== null ? `(${s.ms}ms)` : ""}`),
    ]
      .filter(Boolean)
      .join(" | "),
    duration_ms: Date.now() - start,
  });

  return NextResponse.json(report);
}
