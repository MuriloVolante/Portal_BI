/**
 * Exportação do Banco de Horas — partes usadas no navegador e no servidor.
 */

/** Slug do painel em que o botão "Exportar" aparece. */
export const BANCO_HORAS_SLUG = "banco-horas";

/** Filtros de caixa de seleção, na ordem em que aparecem no modal. */
export const SELECT_FILTERS = [
  { key: "cargo", label: "Cargo", all: "Todos os cargos" },
  { key: "filial", label: "Filial", all: "Todas as filiais" },
  { key: "gerencia", label: "Gerência", all: "Todas as gerências" },
  { key: "local", label: "Local", all: "Todos os locais" },
] as const;

export type SelectFilterKey = (typeof SELECT_FILTERS)[number]["key"];

/** Valores possíveis de cada caixa de seleção. */
export type BancoHorasOptions = Record<SelectFilterKey, string[]>;

export type BancoHorasFilters = Record<SelectFilterKey, string | null> & {
  /** Saldo mínimo em horas decimais (aceita negativo); null = sem mínimo. */
  saldoMin: number | null;
};

const MAX_TEXT_LENGTH = 120;
const MAX_ABS_SALDO = 100_000;

/** Lê e valida os filtros da query string. Retorna erro legível se algo vier errado. */
export function parseBancoHorasFilters(
  params: URLSearchParams
): { filters: BancoHorasFilters } | { error: string } {
  const filters = { saldoMin: null } as BancoHorasFilters;

  for (const { key, label } of SELECT_FILTERS) {
    const value = params.get(key)?.trim() ?? "";
    if (value.length > MAX_TEXT_LENGTH) return { error: `${label} inválido(a).` };
    filters[key] = value || null;
  }

  const saldoRaw = params.get("saldoMin")?.trim().replace(",", ".") ?? "";
  if (saldoRaw !== "") {
    const saldo = Number(saldoRaw);
    if (!Number.isFinite(saldo) || Math.abs(saldo) > MAX_ABS_SALDO) {
      return { error: "Saldo mínimo inválido." };
    }
    filters.saldoMin = saldo;
  }

  return { filters };
}

/** Monta a query string a partir dos filtros (o inverso de parseBancoHorasFilters). */
export function bancoHorasQueryString(filters: BancoHorasFilters): string {
  const params = new URLSearchParams();
  for (const { key } of SELECT_FILTERS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  if (filters.saldoMin !== null) params.set("saldoMin", String(filters.saldoMin));
  return params.toString();
}

/** Resumo legível dos filtros (planilha e histórico de exportações). */
export function describeFilters(filters: Partial<BancoHorasFilters>): string {
  const parts = SELECT_FILTERS.filter(({ key }) => filters[key]).map(
    ({ key, label }) => `${label}: ${filters[key]}`
  );
  if (filters.saldoMin !== null && filters.saldoMin !== undefined) {
    parts.push(`Saldo ≥ ${filters.saldoMin.toLocaleString("pt-BR")} h`);
  }
  return parts.length ? parts.join(" · ") : "Sem filtros (todos)";
}
