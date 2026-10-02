import "server-only";
import { lookup } from "node:dns/promises";
import { isIP, Socket } from "node:net";
import sql from "mssql";
import { isDemoMode } from "@/lib/demo";
import { classifySqlError, sqlDiagnosis, type SqlDiagnosis } from "./errors";
import { REQUIRED_ENV, SQL_PROBE, VIEW, readSqlConfig } from "./source";

export type StepStatus = "ok" | "fail" | "skipped";

export interface DiagnosticStep {
  id: "config" | "dns" | "tcp" | "login" | "query";
  label: string;
  status: StepStatus;
  /** O que foi verificado/encontrado (sem segredos). */
  detail: string;
  ms: number | null;
}

export interface DiagnosticReport {
  ok: boolean;
  steps: DiagnosticStep[];
  /** Primeira falha, traduzida. */
  diagnosis: SqlDiagnosis | null;
  /** De onde a conexão saiu: a TI precisa disso para conferir o firewall. */
  origin: { region: string; publicIp: string | null };
  target: { server: string | null; port: number; database: string | null; user: string | null; view: string };
  ranAt: string;
}

const LABELS: Record<DiagnosticStep["id"], string> = {
  config: "Configuração no portal",
  dns: "Endereço do servidor (DNS)",
  tcp: "Porta aberta (rede/firewall)",
  login: "Login no SQL Server",
  query: "Leitura da view do banco de horas",
};

async function timed<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: unknown; ms: number }> {
  const start = Date.now();
  try {
    return { value: await fn(), ms: Date.now() - start };
  } catch (error) {
    return { error, ms: Date.now() - start };
  }
}

function tcpProbe(host: string, port: number, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const socket = new Socket();
    const fail = (err: Error & { code?: string }) => {
      socket.destroy();
      reject(err);
    };
    socket.setTimeout(timeoutMs, () => fail(Object.assign(new Error(`Sem resposta em ${timeoutMs / 1000}s`), { code: "ETIMEDOUT" })));
    socket.once("error", fail);
    socket.connect(port, host, () => {
      socket.end();
      resolve();
    });
  });
}

async function publicIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store", signal: AbortSignal.timeout(4000) });
    return ((await res.json()) as { ip?: string }).ip ?? null;
  } catch {
    return null;
  }
}

/**
 * Testa a conexão em etapas, parando na primeira falha. Cada etapa diz o que
 * foi tentado e quanto tempo levou — é o que comprova onde está o bloqueio.
 */
export async function runSqlDiagnostics(): Promise<DiagnosticReport> {
  const port = Number(process.env.MSSQL_PORT) || 1433;
  const target = {
    server: process.env.MSSQL_SERVER ?? null,
    port,
    database: process.env.MSSQL_DATABASE ?? null,
    user: process.env.MSSQL_USER ?? null,
    view: VIEW,
  };
  const ipPromise = publicIp();
  const steps: DiagnosticStep[] = [];
  let diagnosis: SqlDiagnosis | null = null;

  const push = (id: DiagnosticStep["id"], status: StepStatus, detail: string, ms: number | null) =>
    steps.push({ id, label: LABELS[id], status, detail, ms });
  const skipRest = (from: DiagnosticStep["id"][], why = "Não testado (etapa anterior falhou).") =>
    from.forEach((id) => push(id, "skipped", why, null));

  if (isDemoMode) {
    push("config", "ok", "Modo demo: dados fictícios, sem SQL Server.", 0);
    skipRest(["dns", "tcp", "login", "query"], "Não se aplica no modo demo.");
    return { ok: true, steps, diagnosis: null, origin: { region: "demo", publicIp: null }, target, ranAt: new Date().toISOString() };
  }

  // 1. Variáveis de ambiente
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) {
    push("config", "fail", `Faltam: ${missing.join(", ")}.`, 0);
    diagnosis = sqlDiagnosis("CONFIG_AUSENTE", `Variáveis ausentes: ${missing.join(", ")}`);
    skipRest(["dns", "tcp", "login", "query"]);
  } else {
    push(
      "config",
      "ok",
      `Servidor ${target.server}, porta ${port}, banco ${target.database}, usuário ${target.user}. ` +
        `Criptografia ${process.env.MSSQL_ENCRYPT === "false" ? "desligada" : "ligada"}` +
        `${process.env.MSSQL_TRUST_SERVER_CERTIFICATE === "true" ? " (aceita certificado autoassinado)" : ""}.`,
      0
    );
    const host = target.server!.split("\\")[0];

    // 2. DNS
    let address = host;
    if (isIP(host)) {
      push("dns", "ok", `Endereço já é um IP (${host}).`, 0);
    } else {
      const r = await timed(() => lookup(host, { all: true }));
      if (r.error) {
        push("dns", "fail", `Não foi possível resolver "${host}".`, r.ms);
        diagnosis = classifySqlError(r.error);
      } else {
        address = r.value![0].address;
        push("dns", "ok", `"${host}" → ${r.value!.map((a) => a.address).join(", ")}`, r.ms);
      }
    }

    // 3. TCP
    if (!diagnosis) {
      const r = await timed(() => tcpProbe(address, port, 10_000));
      if (r.error) {
        const err = r.error as { code?: string; message?: string };
        push("tcp", "fail", `${address}:${port} → ${err.code ?? ""} ${err.message ?? ""}`.trim(), r.ms);
        diagnosis = classifySqlError(r.error);
      } else {
        push("tcp", "ok", `${address}:${port} aceitou a conexão.`, r.ms);
      }
    }

    // 4 e 5. Login e leitura da view (conexão própria, fora do pool)
    if (!diagnosis) {
      const pool = new sql.ConnectionPool(readSqlConfig());
      const login = await timed(() => pool.connect());
      if (login.error) {
        push("login", "fail", "O servidor respondeu, mas a autenticação/handshake falhou.", login.ms);
        diagnosis = classifySqlError(login.error);
      } else {
        push("login", "ok", `Conectado como ${target.user} no banco ${target.database}.`, login.ms);
        const probe = await timed(() => pool.request().query(SQL_PROBE));
        if (probe.error) {
          push("query", "fail", `Falha ao ler ${VIEW}.`, probe.ms);
          diagnosis = classifySqlError(probe.error);
        } else {
          push("query", "ok", `${VIEW} respondeu com todas as colunas esperadas.`, probe.ms);
        }
      }
      await pool.close().catch(() => undefined);
    }

    const done = new Set(steps.map((s) => s.id));
    skipRest((["dns", "tcp", "login", "query"] as const).filter((id) => !done.has(id)));
  }

  return {
    ok: !diagnosis,
    steps,
    diagnosis,
    origin: { region: process.env.VERCEL_REGION ?? "local", publicIp: await ipPromise },
    target,
    ranAt: new Date().toISOString(),
  };
}
