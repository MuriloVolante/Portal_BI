export type Role = "user" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

/** Página completa — embed_url só existe no servidor (service role). */
export interface Page {
  id: string;
  slug: string;
  label: string;
  embed_url: string;
  icon: string | null;
  order: number;
  is_active: boolean;
  created_at: string;
}

/** Versão segura da página, sem embed_url — é o que o frontend enxerga. */
export type SidebarPage = Omit<Page, "embed_url">;

export interface UserPage {
  id: string;
  user_id: string;
  page_id: string;
  created_at: string;
}

/** Linha da tabela de usuários na área admin. */
export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  page_count: number;
  created_at: string;
  /** Acesso desativado (ban no Supabase Auth). */
  banned: boolean;
  /** Último login (Supabase Auth) — null se nunca entrou. */
  last_sign_in_at: string | null;
  /** Último acesso real (abertura de dashboard) — null se nunca usou. */
  last_seen_at: string | null;
}
