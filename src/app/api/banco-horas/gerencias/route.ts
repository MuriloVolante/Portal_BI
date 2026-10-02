import { NextResponse } from "next/server";
import { checkPageAccess } from "@/lib/auth/pageAccess";
import { BANCO_HORAS_SLUG } from "@/lib/bancoHoras/filters";
import { BancoHorasConfigError, listGerencias } from "@/lib/bancoHoras/source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Opções do select de gerência no modal de exportação. */
export async function GET() {
  const access = await checkPageAccess(BANCO_HORAS_SLUG);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    return NextResponse.json({ gerencias: await listGerencias() });
  } catch (err) {
    console.error("[banco-horas] gerências:", err);
    const error =
      err instanceof BancoHorasConfigError
        ? "A conexão com o banco de horas ainda não foi configurada."
        : "Não foi possível consultar o banco de horas agora.";
    return NextResponse.json({ error }, { status: 502 });
  }
}
