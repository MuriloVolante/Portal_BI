import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type { BancoHorasFilters } from "./filters";

export interface ExportLogEntry {
  id: string;
  user_email: string | null;
  action: "export" | "options" | "diagnostic";
  status: "ok" | "empty" | "error" | "denied";
  filters: Partial<BancoHorasFilters> | null;
  row_count: number | null;
  error_code: string | null;
  error_detail: string | null;
  duration_ms: number | null;
  region: string | null;
  created_at: string;
}

export type NewExportLog = Omit<ExportLogEntry, "id" | "created_at" | "region"> & { user_id: string | null };

// Modo demo: histórico em memória.
const globalForAudit = globalThis as unknown as { __demoExportLogs?: ExportLogEntry[] };

/**
 * Registra uma tentativa. Nunca derruba a exportação: se a auditoria falhar,
 * fica só no log do servidor.
 */
export async function logExportAttempt(entry: NewExportLog): Promise<void> {
  const region = process.env.VERCEL_REGION ?? "local";
  console.info("[banco-horas][auditoria]", JSON.stringify({ ...entry, region }));

  if (isDemoMode) {
    const { user_id: _omit, ...rest } = entry;
    globalForAudit.__demoExportLogs ??= [];
    globalForAudit.__demoExportLogs.unshift({ ...rest, id: crypto.randomUUID(), region, created_at: new Date().toISOString() });
    globalForAudit.__demoExportLogs.length = Math.min(globalForAudit.__demoExportLogs.length, 200);
    return;
  }

  const { error } = await createAdminClient().from("export_logs").insert({ ...entry, region });
  if (error) console.error("[banco-horas][auditoria] falha ao gravar:", error.message);
}

export async function listExportLogs(limit = 100): Promise<ExportLogEntry[]> {
  if (isDemoMode) return (globalForAudit.__demoExportLogs ?? []).slice(0, limit);
  const { data, error } = await createAdminClient()
    .from("export_logs")
    .select("id, user_email, action, status, filters, row_count, error_code, error_detail, duration_ms, region, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ExportLogEntry[];
}
