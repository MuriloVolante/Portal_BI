/**
 * Exportação do Banco de Horas — partes usadas no navegador e no servidor.
 */

/** Slug do painel em que o botão "Exportar" aparece. */
export const BANCO_HORAS_SLUG = "banco-horas";

export interface BancoHorasFilters {
  /** null = todas as gerências. */
  gerencia: string | null;
  /** Saldo mínimo em horas (aceita negativo); null = sem mínimo. */
  saldoMin: number | null;
}

const MAX_GERENCIA_LENGTH = 120;
const MAX_ABS_SALDO = 100_000;

/** Lê e valida os filtros da query string. Retorna erro legível se algo vier errado. */
export function parseBancoHorasFilters(
  params: URLSearchParams
): { filters: BancoHorasFilters } | { error: string } {
  const gerenciaRaw = params.get("gerencia")?.trim() ?? "";
  if (gerenciaRaw.length > MAX_GERENCIA_LENGTH) return { error: "Gerência inválida." };

  const saldoRaw = params.get("saldoMin")?.trim().replace(",", ".") ?? "";
  let saldoMin: number | null = null;
  if (saldoRaw !== "") {
    saldoMin = Number(saldoRaw);
    if (!Number.isFinite(saldoMin) || Math.abs(saldoMin) > MAX_ABS_SALDO) {
      return { error: "Saldo mínimo inválido." };
    }
  }

  return { filters: { gerencia: gerenciaRaw || null, saldoMin } };
}

/** Monta a query string a partir dos filtros (o inverso de parseBancoHorasFilters). */
export function bancoHorasQueryString(filters: BancoHorasFilters): string {
  const params = new URLSearchParams();
  if (filters.saldoMin !== null) params.set("saldoMin", String(filters.saldoMin));
  if (filters.gerencia) params.set("gerencia", filters.gerencia);
  return params.toString();
}
