import { createAdminClient } from "@/lib/supabase/server";
import {
  DEMO_USERS,
  demoAccessLogs,
  demoCountPermissions,
  demoLastSeen,
  demoListPages,
  isDemoMode,
} from "@/lib/demo";
import { APP_TIME_ZONE } from "@/lib/utils";

const DAYS = 14;
const DAY_MS = 86_400_000;
/** A partir de quantos dias sem abrir painel a conta aparece como inativa. */
export const INACTIVE_DAYS = 30;

export interface InactiveUser {
  id: string;
  name: string | null;
  email: string;
  /** Último acesso (última vez no portal, ou último login se nunca houve registro); null = nunca. */
  lastAccess: string | null;
  /** Dias desde o último acesso; null = nunca. */
  days: number | null;
}

export interface OverviewData {
  users: { total: number; banned: number; seenLast24h: number };
  pages: { total: number; active: number };
  permissions: { total: number; usersWithAccess: number };
  /** Acessos por dia, do mais antigo ao mais recente (14 dias). */
  daily: { key: string; label: string; weekday: string; count: number }[];
  /** Painéis mais acessados no mesmo período. */
  topPages: { label: string; count: number }[];
  periodTotal: number;
  /** Contas ativas sem acesso há mais de INACTIVE_DAYS (nunca primeiro). */
  inactive: InactiveUser[];
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE });
const dayLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TIME_ZONE, day: "2-digit", month: "2-digit" });
const weekdayLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TIME_ZONE, weekday: "short" });

function findInactive(
  users: { id: string; email: string; name: string | null; lastAccess: string | null; banned: boolean }[]
): InactiveUser[] {
  const now = Date.now();
  return users
    .filter((u) => !u.banned)
    .map((u) => {
      const t = u.lastAccess ? new Date(u.lastAccess).getTime() : NaN;
      return { ...u, days: Number.isFinite(t) ? Math.floor((now - t) / DAY_MS) : null };
    })
    .filter((u) => u.days === null || u.days > INACTIVE_DAYS)
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity))
    .map(({ id, name, email, lastAccess, days }) => ({ id, name, email, lastAccess, days }));
}

type LogRow = { created_at: string; page_label: string; page_id?: string | null };

function aggregate(logs: LogRow[]) {
  const now = Date.now();
  const daily = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(now - (DAYS - 1 - i) * DAY_MS);
    return { key: dayKey.format(d), label: dayLabel.format(d), weekday: weekdayLabel.format(d).replace(".", ""), count: 0 };
  });
  const byKey = new Map(daily.map((d) => [d.key, d]));
  const byPage = new Map<string, number>();
  let periodTotal = 0;

  for (const log of logs) {
    const bucket = byKey.get(dayKey.format(new Date(log.created_at)));
    if (!bucket) continue;
    bucket.count++;
    periodTotal++;
    // Ranking só de painéis (retorno ao portal sem painel na tela fica fora).
    if (log.page_id !== null) byPage.set(log.page_label, (byPage.get(log.page_label) ?? 0) + 1);
  }

  const topPages = Array.from(byPage, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return { daily, topPages, periodTotal };
}

export async function getOverviewData(): Promise<OverviewData> {
  if (isDemoMode) {
    const pages = demoListPages();
    const since = Date.now() - DAY_MS;
    const userIdsWithAccess = new Set(
      DEMO_USERS.filter((u) => demoCountPermissions(u.id) > 0).map((u) => u.id)
    );
    return {
      users: {
        total: DEMO_USERS.length,
        banned: DEMO_USERS.filter((u) => u.banned).length,
        seenLast24h: DEMO_USERS.filter((u) => {
          const seen = demoLastSeen(u.id);
          return seen && new Date(seen).getTime() >= since;
        }).length,
      },
      pages: { total: pages.length, active: pages.filter((p) => p.is_active).length },
      permissions: { total: demoCountPermissions(), usersWithAccess: userIdsWithAccess.size },
      ...aggregate(demoAccessLogs()),
      inactive: findInactive(
        DEMO_USERS.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.full_name,
          lastAccess: demoLastSeen(u.id),
          banned: !!u.banned,
        }))
      ),
    };
  }

  const admin = createAdminClient();
  const since24h = new Date(Date.now() - DAY_MS).toISOString();
  const sincePeriod = new Date(Date.now() - DAYS * DAY_MS).toISOString();

  const [usersRes, seenRes, pagesRes, permsRes, logsRes, profilesRes] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", since24h),
    admin.from("pages").select("is_active"),
    admin.from("user_pages").select("user_id"),
    admin
      .from("access_logs")
      .select("created_at, page_label, page_id")
      .gte("created_at", sincePeriod)
      .order("created_at", { ascending: false })
      .limit(20000),
    admin.from("profiles").select("id, full_name, last_seen_at"),
  ]);

  const users = usersRes.data?.users ?? [];
  const isBanned = (u: (typeof users)[number]) => {
    const until = (u as { banned_until?: string }).banned_until;
    return !!until && new Date(until).getTime() > Date.now();
  };
  const banned = users.filter(isBanned).length;
  const profileById = new Map(
    ((profilesRes.data ?? []) as { id: string; full_name: string | null; last_seen_at: string | null }[]).map((p) => [p.id, p])
  );
  const pages = (pagesRes.data ?? []) as { is_active: boolean }[];
  const perms = (permsRes.data ?? []) as { user_id: string }[];

  return {
    users: { total: users.length, banned, seenLast24h: seenRes.count ?? 0 },
    pages: { total: pages.length, active: pages.filter((p) => p.is_active).length },
    permissions: { total: perms.length, usersWithAccess: new Set(perms.map((p) => p.user_id)).size },
    ...aggregate((logsRes.data ?? []) as LogRow[]),
    inactive: findInactive(
      users.map((u) => ({
        id: u.id,
        email: u.email ?? "—",
        name: profileById.get(u.id)?.full_name ?? null,
        // Mesma regra da coluna "Último acesso" da lista de usuários.
        lastAccess: profileById.get(u.id)?.last_seen_at ?? u.last_sign_in_at ?? null,
        banned: isBanned(u),
      }))
    ),
  };
}
