import "server-only";
import sql from "mssql";
import { isDemoMode } from "@/lib/demo";
import { SELECT_FILTERS, type BancoHorasFilters, type BancoHorasOptions } from "./filters";

/*
 * ============================================================================
 *  ONDE ESTÃO OS DADOS — confirme com a TI e ajuste aqui.
 * ============================================================================
 *  VIEW: tabela ou view (com schema) que tem uma linha por colaborador.
 *  COLUMNS: nome real de cada coluna na view.
 *  EXPORT_COLUMNS: colunas da planilha, na ordem, com o título do Excel.
 */
export const VIEW = "dbo.vw_BancoHoras";

const COLUMNS = {
  matricula: "Matricula",
  nome: "Nome",
  cargo: "Cargo",
  filial: "Filial",
  gerencia: "Gerencia",
  local: "Local",
  saldo: "Saldo", // horas decimais (ex.: 40.5)
} as const;

const EXPORT_COLUMNS: { column: keyof typeof COLUMNS; title: string }[] = [
  { column: "matricula", title: "Matrícula" },
  { column: "nome", title: "Colaborador" },
  { column: "cargo", title: "Cargo" },
  { column: "filial", title: "Filial" },
  { column: "gerencia", title: "Gerência" },
  { column: "local", title: "Local" },
  { column: "saldo", title: "Saldo (h)" },
];

/** Limite de segurança para não montar planilhas gigantes por engano. */
const MAX_ROWS = 50_000;

// ---------------------------------------------------------------------------
// SQL montado a partir da configuração acima. Valores digitados pelo gestor
// SEMPRE entram como parâmetro (@cargo, @saldoMin…), nunca no texto.
// ---------------------------------------------------------------------------

/** [schema].[objeto] — só aceita nomes simples (letras, números, _). */
function quoteIdent(name: string) {
  return name
    .split(".")
    .map((part) => {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) throw new Error(`Nome inválido na configuração: ${name}`);
      return `[${part}]`;
    })
    .join(".");
}

const col = (key: keyof typeof COLUMNS) => quoteIdent(COLUMNS[key]);

const SQL_EXPORT = `
  SELECT TOP (${MAX_ROWS + 1})
    ${EXPORT_COLUMNS.map((c) => `${col(c.column)} AS [${c.title}]`).join(",\n    ")}
  FROM ${quoteIdent(VIEW)}
  WHERE ${SELECT_FILTERS.map(({ key }) => `(@${key} IS NULL OR ${col(key)} = @${key})`).join("\n    AND ")}
    AND (@saldoMin IS NULL OR ${col("saldo")} >= @saldoMin)
  ORDER BY ${col("saldo")} DESC, ${col("nome")}
`;

const SQL_OPTIONS = SELECT_FILTERS.map(
  ({ key }) => `
  SELECT DISTINCT '${key}' AS campo, CAST(LTRIM(RTRIM(${col(key)})) AS NVARCHAR(200)) AS valor
  FROM ${quoteIdent(VIEW)}
  WHERE ${col(key)} IS NOT NULL AND LTRIM(RTRIM(${col(key)})) <> ''`
).join("\n  UNION ALL") + "\n  ORDER BY campo, valor";

/** Consulta mínima usada pelo diagnóstico: valida view, colunas e permissão. */
export const SQL_PROBE = `SELECT TOP (1) ${Object.keys(COLUMNS)
  .map((k) => col(k as keyof typeof COLUMNS))
  .join(", ")} FROM ${quoteIdent(VIEW)}`;

export type BancoHorasRow = Record<string, string | number | Date | null>;

export class BancoHorasConfigError extends Error {
  name = "BancoHorasConfigError";
}

// ---------------------------------------------------------------------------
// Conexão (credenciais SÓ em variáveis de ambiente da Vercel)
// ---------------------------------------------------------------------------

export const REQUIRED_ENV = ["MSSQL_SERVER", "MSSQL_DATABASE", "MSSQL_USER", "MSSQL_PASSWORD"] as const;

export function readSqlConfig(): sql.config {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new BancoHorasConfigError(`Variáveis ausentes: ${missing.join(", ")}`);
  }
  return {
    server: process.env.MSSQL_SERVER!,
    database: process.env.MSSQL_DATABASE!,
    user: process.env.MSSQL_USER!,
    password: process.env.MSSQL_PASSWORD!,
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
    const pool = new sql.ConnectionPool(readSqlConfig());
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

export async function listBancoHorasOptions(): Promise<BancoHorasOptions> {
  if (isDemoMode) return demoOptions();
  const pool = await getPool();
  const result = await pool.request().query<{ campo: string; valor: string }>(SQL_OPTIONS);
  const options = Object.fromEntries(SELECT_FILTERS.map(({ key }) => [key, [] as string[]])) as BancoHorasOptions;
  for (const row of result.recordset) {
    options[row.campo as keyof BancoHorasOptions]?.push(row.valor);
  }
  return options;
}

export async function fetchBancoHoras(
  filters: BancoHorasFilters
): Promise<{ columns: string[]; rows: BancoHorasRow[]; truncated: boolean }> {
  const columns = EXPORT_COLUMNS.map((c) => c.title);
  let rows: BancoHorasRow[];

  if (isDemoMode) {
    rows = demoRows(filters);
  } else {
    const request = (await getPool()).request();
    for (const { key } of SELECT_FILTERS) request.input(key, sql.NVarChar(200), filters[key]);
    request.input("saldoMin", sql.Decimal(18, 2), filters.saldoMin);
    rows = (await request.query<BancoHorasRow>(SQL_EXPORT)).recordset;
  }

  const truncated = rows.length > MAX_ROWS;
  return { columns, rows: truncated ? rows.slice(0, MAX_ROWS) : rows, truncated };
}

// ---------------------------------------------------------------------------
// Modo demo: dados fictícios, mesmas regras de filtro
// ---------------------------------------------------------------------------

const DEMO_VALUES = {
  cargo: ["ANALISTA DE RH", "AUXILIAR ADMINISTRATIVO", "MECÂNICO", "MOTORISTA", "SUPERVISOR"],
  filial: ["APUCARANA", "CURITIBA", "LONDRINA", "MARINGÁ"],
  gerencia: ["ADMINISTRATIVO", "MANUTENÇÃO", "OPERAÇÃO", "RECURSOS HUMANOS", "TRÁFEGO"],
  local: ["ESCRITÓRIO", "GARAGEM", "OFICINA", "RODOVIÁRIA"],
};
const DEMO_NOMES = [
  "Ana Paula Ribeiro", "Bruno Carvalho", "Carla Nogueira", "Diego Martins", "Eduardo Lima",
  "Fernanda Alves", "Gustavo Pereira", "Helena Costa", "Igor Fernandes", "Joana Duarte",
  "Leandro Souza", "Mariana Rocha", "Nelson Teixeira", "Olívia Barros", "Paulo Henrique",
  "Renata Gomes", "Sérgio Moura", "Tatiane Dias", "Vinícius Araújo", "Wagner Pinto",
];

function demoOptions(): BancoHorasOptions {
  return DEMO_VALUES;
}

function demoRows(filters: BancoHorasFilters): BancoHorasRow[] {
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pick = (list: string[]) => list[Math.floor(rand() * list.length)];
  const all = Array.from({ length: 220 }, (_, i) => ({
    matricula: 10_000 + i * 7,
    nome: `${DEMO_NOMES[i % DEMO_NOMES.length]}${i >= DEMO_NOMES.length ? ` ${Math.floor(i / DEMO_NOMES.length) + 1}` : ""}`,
    cargo: pick(DEMO_VALUES.cargo),
    filial: pick(DEMO_VALUES.filial),
    gerencia: pick(DEMO_VALUES.gerencia),
    local: pick(DEMO_VALUES.local),
    saldo: Math.round((rand() * 140 - 30) * 100) / 100,
  }));
  return all
    .filter((r) => SELECT_FILTERS.every(({ key }) => !filters[key] || r[key] === filters[key]))
    .filter((r) => filters.saldoMin === null || r.saldo >= filters.saldoMin)
    .sort((a, b) => b.saldo - a.saldo || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((r) => Object.fromEntries(EXPORT_COLUMNS.map((c) => [c.title, r[c.column]])));
}
