/**
 * Tradução dos erros de conexão/consulta do SQL Server em diagnósticos
 * legíveis: o que aconteceu, quem resolve e o detalhe técnico para a TI.
 */

export type SqlErrorCode =
  | "CONFIG_AUSENTE"
  | "DNS_NAO_ENCONTRADO"
  | "CONEXAO_RECUSADA"
  | "TEMPO_ESGOTADO"
  | "REDE_INACESSIVEL"
  | "CERTIFICADO_TLS"
  | "LOGIN_RECUSADO"
  | "BANCO_INEXISTENTE"
  | "OBJETO_INEXISTENTE"
  | "COLUNA_INEXISTENTE"
  | "SEM_PERMISSAO"
  | "CONSULTA_DEMOROU"
  | "ERRO_DESCONHECIDO";

export interface SqlDiagnosis {
  code: SqlErrorCode;
  /** O que aconteceu, em uma frase. */
  title: string;
  /** O que fazer / quem resolve. */
  hint: string;
  /** Mensagem técnica original (só para admin e para o log de auditoria). */
  detail: string;
}

const CATALOG: Record<SqlErrorCode, { title: string; hint: string }> = {
  CONFIG_AUSENTE: {
    title: "A conexão com o SQL Server não está configurada no portal.",
    hint: "Cadastre as variáveis MSSQL_* na Vercel (Settings → Environment Variables) e faça um novo deploy.",
  },
  DNS_NAO_ENCONTRADO: {
    title: "O endereço do servidor não existe na internet.",
    hint: "Provavelmente é um nome da rede interna. A TI precisa informar um endereço público (ou IP) acessível de fora da empresa.",
  },
  CONEXAO_RECUSADA: {
    title: "O servidor foi encontrado, mas recusou a conexão na porta informada.",
    hint: "A porta está fechada ou o SQL Server não está escutando nela. A TI precisa conferir a porta e se o TCP/IP do SQL Server está habilitado.",
  },
  TEMPO_ESGOTADO: {
    title: "O servidor não respondeu: a conexão ficou sem resposta até esgotar o tempo.",
    hint: "Sinal típico de firewall bloqueando a entrada. A TI precisa liberar a porta do SQL Server para conexões vindas da internet (os IPs da Vercel mudam).",
  },
  REDE_INACESSIVEL: {
    title: "Não existe rota de rede até o servidor.",
    hint: "O endereço é privado ou não está publicado na internet. A TI precisa expor o SQL Server (ou uma réplica) com acesso externo.",
  },
  CERTIFICADO_TLS: {
    title: "A conexão chegou ao servidor, mas o certificado de segurança (TLS) foi recusado.",
    hint: "Se o certificado for autoassinado, defina MSSQL_TRUST_SERVER_CERTIFICATE=true na Vercel. Se o servidor não usa TLS, MSSQL_ENCRYPT=false.",
  },
  LOGIN_RECUSADO: {
    title: "O servidor respondeu, mas recusou o usuário ou a senha.",
    hint: "Confira MSSQL_USER e MSSQL_PASSWORD. A TI precisa confirmar que o login SQL existe, está habilitado e que o servidor aceita autenticação SQL.",
  },
  BANCO_INEXISTENTE: {
    title: "Login aceito, mas o banco de dados informado não existe ou o usuário não tem acesso a ele.",
    hint: "Confira MSSQL_DATABASE e se o usuário tem acesso a esse banco.",
  },
  OBJETO_INEXISTENTE: {
    title: "Conectou no banco, mas a tabela/view do banco de horas não foi encontrada.",
    hint: "O nome da view no portal está diferente do banco. Ajuste em src/lib/bancoHoras/source.ts.",
  },
  COLUNA_INEXISTENTE: {
    title: "Conectou e achou a view, mas alguma coluna usada pelo portal não existe nela.",
    hint: "Os nomes das colunas no portal estão diferentes da view. Ajuste em src/lib/bancoHoras/source.ts.",
  },
  SEM_PERMISSAO: {
    title: "Conectou, mas o usuário não tem permissão de leitura na view.",
    hint: "A TI precisa conceder SELECT na view para o usuário do portal.",
  },
  CONSULTA_DEMOROU: {
    title: "Conectou, mas a consulta demorou demais e foi cancelada.",
    hint: "Tente filtros mais restritos. Se persistir, a TI pode avaliar índices na view.",
  },
  ERRO_DESCONHECIDO: {
    title: "Erro inesperado ao falar com o SQL Server.",
    hint: "Veja o detalhe técnico e repasse à TI.",
  },
};

export function sqlDiagnosis(code: SqlErrorCode, detail = ""): SqlDiagnosis {
  return { code, ...CATALOG[code], detail };
}

interface ErrorLike {
  message?: string;
  code?: string;
  number?: number;
  originalError?: unknown;
  cause?: unknown;
  errors?: unknown[];
}

/** Junta a cadeia de erros (mssql → tedious → node) para procurar a causa real. */
function chain(err: unknown): ErrorLike[] {
  const out: ErrorLike[] = [];
  const queue: unknown[] = [err];
  while (queue.length && out.length < 10) {
    const e = queue.shift();
    if (!e || typeof e !== "object") continue;
    const el = e as ErrorLike;
    out.push(el);
    queue.push(el.originalError, el.cause, ...(Array.isArray(el.errors) ? el.errors : []));
  }
  return out;
}

export function classifySqlError(err: unknown): SqlDiagnosis {
  const errors = chain(err);
  const detail = errors
    .map((e) => [e.code, e.number, e.message].filter(Boolean).join(" "))
    .filter(Boolean)
    .filter((v, i, all) => all.indexOf(v) === i)
    .join(" | ")
    .slice(0, 900) || String(err);

  const codes = new Set(errors.map((e) => e.code).filter(Boolean));
  const numbers = new Set(errors.map((e) => e.number).filter((n) => typeof n === "number"));
  const text = detail.toLowerCase();

  if (err instanceof Error && err.name === "BancoHorasConfigError") return sqlDiagnosis("CONFIG_AUSENTE", detail);
  if (codes.has("ENOTFOUND") || codes.has("EAI_AGAIN") || text.includes("getaddrinfo")) {
    return sqlDiagnosis("DNS_NAO_ENCONTRADO", detail);
  }
  if (codes.has("ECONNREFUSED")) return sqlDiagnosis("CONEXAO_RECUSADA", detail);
  if (codes.has("EHOSTUNREACH") || codes.has("ENETUNREACH")) return sqlDiagnosis("REDE_INACESSIVEL", detail);
  if (text.includes("certificate") || text.includes("self signed") || text.includes("self-signed") || text.includes("ssl") || text.includes("tls")) {
    return sqlDiagnosis("CERTIFICADO_TLS", detail);
  }
  if (numbers.has(4060) || text.includes("cannot open database")) return sqlDiagnosis("BANCO_INEXISTENTE", detail);
  if (codes.has("ELOGIN") || numbers.has(18456)) return sqlDiagnosis("LOGIN_RECUSADO", detail);
  if (numbers.has(208)) return sqlDiagnosis("OBJETO_INEXISTENTE", detail);
  if (numbers.has(207)) return sqlDiagnosis("COLUNA_INEXISTENTE", detail);
  if (numbers.has(229) || numbers.has(230)) return sqlDiagnosis("SEM_PERMISSAO", detail);
  if (codes.has("ETIMEOUT") || codes.has("ETIMEDOUT")) {
    // ETIMEOUT de consulta (RequestError) ≠ de conexão (ConnectionError).
    const isRequest = errors.some((e) => (e as Error).name === "RequestError");
    return sqlDiagnosis(isRequest ? "CONSULTA_DEMOROU" : "TEMPO_ESGOTADO", detail);
  }
  if (codes.has("ESOCKET") && text.includes("could not connect")) return sqlDiagnosis("CONEXAO_RECUSADA", detail);
  return sqlDiagnosis("ERRO_DESCONHECIDO", detail);
}
