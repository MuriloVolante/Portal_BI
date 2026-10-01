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

export interface OverviewData {
  users: { total: number; banned: number; seenLast24h: number };
  pages: { total: number; active: number };
  permissions: { total: number; usersWithAccess: number };
  /** Acessos por dia, do mais antigo ao mais recente (14 dias). */
  daily: { key: string; label: string; weekday: string; count: number }[];
  /** Painéis mais abertos no mesmo período. */
  topPages: { label: string; count: number }[];
  periodTotal: number;
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE });
const dayLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TIME_ZONE, day: "2-digit", month: "2-digit" });
const weekdayLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TIME_ZONE, weekday: "short" });

function aggregate(logs: { created_at: string; page_label: string }[]) {
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
    byPage.set(log.page_label, (byPage.get(log.page_label) ?? 0) + 1);
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
    };
  }

  const admin = createAdminClient();
  const since24h = new Date(Date.now() - DAY_MS).toISOString();
  const sincePeriod = new Date(Date.now() - DAYS * DAY_MS).toISOString();

  const [usersRes, seenRes, pagesRes, permsRes, logsRes] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", since24h),
    admin.from("pages").select("is_active"),
    admin.from("user_pages").select("user_id"),
    admin
      .from("access_logs")
      .select("created_at, page_label")
      .gte("created_at", sincePeriod)
      .order("created_at", { ascending: false })
      .limit(20000),
  ]);

  const users = usersRes.data?.users ?? [];
  const banned = users.filter((u) => {
    const until = (u as { banned_until?: string }).banned_until;
    return !!until && new Date(until).getTime() > Date.now();
  }).length;
  const pages = (pagesRes.data ?? []) as { is_active: boolean }[];
  const perms = (permsRes.data ?? []) as { user_id: string }[];

  return {
    users: { total: users.length, banned, seenLast24h: seenRes.count ?? 0 },
    pages: { total: pages.length, active: pages.filter((p) => p.is_active).length },
    permissions: { total: perms.length, usersWithAccess: new Set(perms.map((p) => p.user_id)).size },
    ...aggregate((logsRes.data ?? []) as { created_at: string; page_label: string }[]),
  };
}
