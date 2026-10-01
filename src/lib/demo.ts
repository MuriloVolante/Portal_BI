/**
 * Modo demo — roda o portal inteiro sem Supabase, com dados em memória.
 * Ative com NEXT_PUBLIC_DEMO_MODE=true no .env.local.
 *
 * Credenciais:
 *   admin@demo.com / demo123  (admin)
 *   user@demo.com  / demo123  (usuário comum)
 */
import type { Profile, Role, SidebarPage } from "@/types";

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_PASSWORD = "demo123";
export const DEMO_SESSION_COOKIE = "demo_session";

/** Relatório de exemplo público da Microsoft — embeddable em iframe. */
const DEMO_EMBED_URL = "https://playground.powerbi.com/sampleReportEmbed";

export interface DemoUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
  /** Só para exibição no demo (acesso desativado). */
  banned?: boolean;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: "00000000-0000-0000-0000-00000000ad01",
    email: "admin@demo.com",
    full_name: "Admin Demo",
    role: "admin",
    created_at: "2026-01-01T12:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-0000000000b1",
    email: "user@demo.com",
    full_name: "Usuária Demo",
    role: "user",
    created_at: "2026-01-15T12:00:00Z",
  },
  // Usuários fictícios extras, para as listas e gráficos do admin terem volume.
  { id: "00000000-0000-0000-0000-0000000000b2", email: "carlos.mendes@demo.com", full_name: "Carlos Mendes", role: "user", created_at: "2026-02-03T12:00:00Z" },
  { id: "00000000-0000-0000-0000-0000000000b3", email: "juliana.rocha@demo.com", full_name: "Juliana Rocha", role: "user", created_at: "2026-02-20T12:00:00Z" },
  { id: "00000000-0000-0000-0000-0000000000b4", email: "patricia.souza@demo.com", full_name: "Patrícia Souza", role: "admin", created_at: "2026-03-11T12:00:00Z" },
  { id: "00000000-0000-0000-0000-0000000000b5", email: "rafael.lima@demo.com", full_name: "Rafael Lima", role: "user", created_at: "2026-04-02T12:00:00Z", banned: true },
];

export function demoFindUserByEmail(email: string): DemoUser | undefined {
  return DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
}

export function demoGetUser(id: string | undefined): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.id === id);
}

export function demoProfileOf(user: DemoUser): Profile {
  return {
    id: user.id,
    full_name: user.full_name,
    role: user.role,
    created_at: user.created_at,
  };
}

// ---------- Store mutável (apenas no servidor) ----------

interface DemoPage extends SidebarPage {
  embed_url: string;
}

interface DemoStore {
  pages: DemoPage[];
  /** chaves "userId:pageId" */
  permissions: Set<string>;
  /** userId → fim da liberação de redefinição de senha (ms). */
  resetWindows: Map<string, number>;
}

function createInitialStore(): DemoStore {
  const pages: DemoPage[] = [
    {
      id: "00000000-0000-0000-0000-000000000a01",
      slug: "vendas",
      label: "Vendas",
      icon: "BarChart3",
      order: 1,
      is_active: true,
      created_at: "2026-01-01T12:00:00Z",
      embed_url: DEMO_EMBED_URL,
    },
    {
      id: "00000000-0000-0000-0000-000000000a02",
      slug: "financeiro",
      label: "Financeiro",
      icon: "Wallet",
      order: 2,
      is_active: true,
      created_at: "2026-01-01T12:00:00Z",
      embed_url: DEMO_EMBED_URL,
    },
    {
      id: "00000000-0000-0000-0000-000000000a03",
      slug: "operacoes",
      label: "Operações",
      icon: "Factory",
      order: 3,
      is_active: true,
      created_at: "2026-01-01T12:00:00Z",
      embed_url: DEMO_EMBED_URL,
    },
  ];

  const [, user, carlos, juliana, , rafael] = DEMO_USERS;
  return {
    pages,
    permissions: new Set([
      `${user.id}:${pages[0].id}`,
      `${user.id}:${pages[1].id}`,
      `${carlos.id}:${pages[0].id}`,
      `${carlos.id}:${pages[2].id}`,
      `${juliana.id}:${pages[1].id}`,
      `${rafael.id}:${pages[2].id}`,
    ]),
    // A usuária demo já começa com a redefinição liberada, para dar para
    // testar o fluxo do "Esqueceu a senha?" no Preview.
    resetWindows: new Map([[user.id, Date.now() + 24 * 3_600_000]]),
  };
}

// Sobrevive ao HMR do Next em dev.
const globalForDemo = globalThis as unknown as { __demoStore?: DemoStore };

export function demoStore(): DemoStore {
  globalForDemo.__demoStore ??= createInitialStore();
  return globalForDemo.__demoStore;
}

export function demoListPages(): SidebarPage[] {
  return demoStore()
    .pages.map(({ embed_url: _omit, ...page }) => page)
    .sort((a, b) => a.order - b.order);
}

export function demoGetPageBySlug(slug: string): DemoPage | undefined {
  return demoStore().pages.find((p) => p.slug === slug);
}

export function demoHasPermission(userId: string, pageId: string): boolean {
  return demoStore().permissions.has(`${userId}:${pageId}`);
}

export function demoAllowedPages(userId: string, role: Role): SidebarPage[] {
  return demoListPages().filter(
    (p) =>
      p.is_active && (role === "admin" || demoHasPermission(userId, p.id))
  );
}

export function demoTogglePermission(
  userId: string,
  pageId: string,
  enabled: boolean
) {
  const key = `${userId}:${pageId}`;
  if (enabled) demoStore().permissions.add(key);
  else demoStore().permissions.delete(key);
}

export function demoCountPermissions(userId?: string): number {
  const all = Array.from(demoStore().permissions);
  return userId
    ? all.filter((k) => k.startsWith(`${userId}:`)).length
    : all.length;
}

export function demoCreatePage(input: {
  slug: string;
  label: string;
  embed_url?: string;
  icon?: string;
  order: number;
  is_active: boolean;
}): { error?: string } {
  const store = demoStore();
  if (store.pages.some((p) => p.slug === input.slug)) {
    return { error: "Já existe uma página com esse slug." };
  }
  store.pages.push({
    id: crypto.randomUUID(),
    slug: input.slug,
    label: input.label,
    icon: input.icon || null,
    order: input.order,
    is_active: input.is_active,
    created_at: new Date().toISOString(),
    embed_url: input.embed_url || DEMO_EMBED_URL,
  });
  return {};
}

export function demoUpdatePage(
  id: string,
  input: {
    slug: string;
    label: string;
    embed_url?: string;
    icon?: string;
    order: number;
    is_active: boolean;
  }
): { error?: string } {
  const store = demoStore();
  const page = store.pages.find((p) => p.id === id);
  if (!page) return { error: "Página não encontrada." };
  if (store.pages.some((p) => p.slug === input.slug && p.id !== id)) {
    return { error: "Já existe uma página com esse slug." };
  }
  page.slug = input.slug;
  page.label = input.label;
  page.icon = input.icon || null;
  page.order = input.order;
  page.is_active = input.is_active;
  if (input.embed_url) page.embed_url = input.embed_url;
  return {};
}

export function demoDeletePage(id: string) {
  const store = demoStore();
  store.pages = store.pages.filter((p) => p.id !== id);
  store.permissions = new Set(
    Array.from(store.permissions).filter((k) => !k.endsWith(`:${id}`))
  );
}

// ---------- Histórico de acessos fictício (determinístico) ----------

export interface DemoAccessLog {
  id: string;
  user_id: string;
  page_id: string;
  page_label: string;
  created_at: string;
}

/** Gerador pseudoaleatório com semente fixa: o mesmo histórico a cada carga. */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Acessos dos últimos 14 dias, do mais recente para o mais antigo. */
export function demoAccessLogs(): DemoAccessLog[] {
  const store = demoStore();
  const rand = seeded(20261001);
  const now = Date.now();
  const logs: DemoAccessLog[] = [];

  for (let day = 13; day >= 0; day--) {
    const weekday = new Date(now - day * 86_400_000).getDay();
    const busy = weekday === 0 || weekday === 6 ? 0.35 : 1;
    for (const user of DEMO_USERS) {
      const pages = store.pages.filter(
        (p) => user.role === "admin" || store.permissions.has(`${user.id}:${p.id}`)
      );
      if (!pages.length || user.banned) continue;
      const visits = Math.floor(rand() * 4 * busy);
      for (let v = 0; v < visits; v++) {
        const page = pages[Math.floor(rand() * pages.length)];
        const hour = 8 + Math.floor(rand() * 10);
        const at = new Date(now - day * 86_400_000);
        at.setUTCHours(hour + 3, Math.floor(rand() * 60), 0, 0);
        if (at.getTime() > now) continue;
        logs.push({
          id: `${day}-${user.id}-${v}`,
          user_id: user.id,
          page_id: page.id,
          page_label: page.label,
          created_at: at.toISOString(),
        });
      }
    }
  }
  return logs.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function demoLastSeen(userId: string): string | null {
  return demoAccessLogs().find((l) => l.user_id === userId)?.created_at ?? null;
}

// ---------- Redefinição de senha liberada pelo admin ----------

export function demoResetUntil(userId: string): string | null {
  const until = demoStore().resetWindows.get(userId);
  return until && until > Date.now() ? new Date(until).toISOString() : null;
}

export function demoSetResetWindow(userId: string, until: number | null) {
  if (until) demoStore().resetWindows.set(userId, until);
  else demoStore().resetWindows.delete(userId);
}
