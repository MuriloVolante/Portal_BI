import "server-only";
import sql from "mssql";
import { isDemoMode } from "@/lib/demo";
import type { BancoHorasFilters } from "./filters";

/*
 * ============================================================================
 *  CONSULTAS DO SQL SERVER — ajuste aqui os nomes de tabela/view e colunas.
 * ============================================================================
 *  - Sempre parametrizadas (@gerencia, @saldoMin): o valor digitado pelo
 *    gestor nunca entra no texto do SQL.
 *  - As colunas do Excel são exatamente as colunas que a consulta devolve,
 *    na mesma ordem e com os mesmos nomes (use AS para dar nomes legíveis).
 *  - Colunas numéricas saem como número no Excel (dá para somar/filtrar).
 */
const SQL_EXPORT = `
  SELECT
    Matricula AS [Matrícula],
    Nome      AS [Colaborador],
    Gerencia  AS [Gerência],
    Setor     AS [Setor],
    Saldo     AS [Saldo (h)]
  FROM dbo.vw_BancoHoras
  WHERE (@gerencia IS NULL OR Gerencia = @gerencia)
    AND (@saldoMin IS NULL OR Saldo >= @saldoMin)
  ORDER BY Saldo DESC, Nome
`;

const SQL_GERENCIAS = `
  SELECT DISTINCT Gerencia AS gerencia
  FROM dbo.vw_BancoHoras
  WHERE Gerencia IS NOT NULL AND LTRIM(RTRIM(Gerencia)) <> ''
  ORDER BY Gerencia
`;

/** Limite de segurança para não montar planilhas gigantes por engano. */
const MAX_ROWS = 50_000;

export type BancoHorasRow = Record<string, string | number | Date | null>;

export class BancoHorasConfigError extends Error {}

// ---------------------------------------------------------------------------
// Conexão (credenciais SÓ em variáveis de ambiente da Vercel)
// ---------------------------------------------------------------------------

function readConfig(): sql.config {
  const server = process.env.MSSQL_SERVER;
  const database = process.env.MSSQL_DATABASE;
  const user = process.env.MSSQL_USER;
  const password = process.env.MSSQL_PASSWORD;
  if (!server || !database || !user || !password) {
    throw new BancoHorasConfigError(
      "Conexão com o SQL Server não configurada (MSSQL_SERVER, MSSQL_DATABASE, MSSQL_USER, MSSQL_PASSWORD)."
    );
  }
  return {
    server,
    database,
    user,
    password,
    port: Number(process.env.MSSQL_PORT) || 1433,
    connectionTimeout: 15_000,
    requestTimeout: 45_000,
    pool: { max: 4, min: 0, idleTimeoutMillis: 30_000 },
    options: {
      encrypt: process.env.MSSQL_ENCRYPT !== "false",
      trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === "true",
    },
  };
}

// Reaproveita o pool entre requisições da mesma instância da função.
const globalForSql = globalThis as unknown as { __bancoHorasPool?: Promise<sql.ConnectionPool> };

function getPool(): Promise<sql.ConnectionPool> {
  if (!globalForSql.__bancoHorasPool) {
    const pool = new sql.ConnectionPool(readConfig());
    globalForSql.__bancoHorasPool = pool.connect().catch((err) => {
      // Falhou: a próxima requisição tenta conectar de novo.
      globalForSql.__bancoHorasPool = undefined;
      throw err;
    });
    pool.on("error", () => {
      globalForSql.__bancoHorasPool = undefined;
    });
  }
  return globalForSql.__bancoHorasPool;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export async function listGerencias(): Promise<string[]> {
  if (isDemoMode) return DEMO_GERENCIAS;
  const pool = await getPool();
  const result = await pool.request().query<{ gerencia: string }>(SQL_GERENCIAS);
  return result.recordset.map((r) => String(r.gerencia).trim());
}

export async function fetchBancoHoras(
  filters: BancoHorasFilters
): Promise<{ columns: string[]; rows: BancoHorasRow[]; truncated: boolean }> {
  if (isDemoMode) return demoBancoHoras(filters);

  const pool = await getPool();
  const result = await pool
    .request()
    .input("gerencia", sql.NVarChar(120), filters.gerencia)
    .input("saldoMin", sql.Decimal(18, 2), filters.saldoMin)
    .query<BancoHorasRow>(SQL_EXPORT);

  const columns = Object.keys(result.recordset.columns ?? {}).sort(
    (a, b) => (result.recordset.columns[a].index ?? 0) - (result.recordset.columns[b].index ?? 0)
  );
  const truncated = result.recordset.length > MAX_ROWS;
  return { columns, rows: truncated ? result.recordset.slice(0, MAX_ROWS) : result.recordset, truncated };
}

// ---------------------------------------------------------------------------
// Modo demo: dados fictícios, mesmas regras de filtro
// ---------------------------------------------------------------------------

const DEMO_GERENCIAS = ["ADMINISTRATIVO", "MANUTENÇÃO", "OPERAÇÃO", "RECURSOS HUMANOS", "TRÁFEGO"];
const DEMO_SETORES = ["Oficina", "Garagem", "Escala", "Atendimento", "Pessoal", "Frota"];
const DEMO_NOMES = [
  "Ana Paula Ribeiro", "Bruno Carvalho", "Carla Nogueira", "Diego Martins", "Eduardo Lima",
  "Fernanda Alves", "Gustavo Pereira", "Helena Costa", "Igor Fernandes", "Joana Duarte",
  "Leandro Souza", "Mariana Rocha", "Nelson Teixeira", "Olívia Barros", "Paulo Henrique",
  "Renata Gomes", "Sérgio Moura", "Tatiane Dias", "Vinícius Araújo", "Wagner Pinto",
];

function demoBancoHoras(filters: BancoHorasFilters) {
  const columns = ["Matrícula", "Colaborador", "Gerência", "Setor", "Saldo (h)"];
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const all: BancoHorasRow[] = Array.from({ length: 140 }, (_, i) => ({
    "Matrícula": 10_000 + i * 7,
    "Colaborador": `${DEMO_NOMES[i % DEMO_NOMES.length]}${i >= DEMO_NOMES.length ? ` ${Math.floor(i / DEMO_NOMES.length) + 1}` : ""}`,
    "Gerência": DEMO_GERENCIAS[Math.floor(rand() * DEMO_GERENCIAS.length)],
    "Setor": DEMO_SETORES[Math.floor(rand() * DEMO_SETORES.length)],
    "Saldo (h)": Math.round((rand() * 140 - 30) * 2) / 2,
  }));
  const rows = all
    .filter((r) => !filters.gerencia || r["Gerência"] === filters.gerencia)
    .filter((r) => filters.saldoMin === null || (r["Saldo (h)"] as number) >= filters.saldoMin)
    .sort((a, b) => (b["Saldo (h)"] as number) - (a["Saldo (h)"] as number));
  return { columns, rows, truncated: false };
}
