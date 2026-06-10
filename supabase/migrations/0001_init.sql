-- Portal BI — schema inicial

-- Perfil do usuário (papel)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

-- Páginas disponíveis no sistema
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,         -- identificador usado na URL
  label text not null,               -- nome exibido na sidebar
  embed_url text not null,           -- URL pública do Power BI (nunca exposta diretamente ao frontend)
  icon text,                         -- nome do ícone (lucide)
  "order" integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Permissões por usuário
create table public.user_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  page_id uuid references public.pages(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, page_id)
);

-- Cria o profile automaticamente quando um usuário é criado no Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: o usuário autenticado é admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.pages enable row level security;
alter table public.user_pages enable row level security;

-- profiles: usuário lê o próprio; admin lê todos; escrita apenas admin
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_update"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- pages: leitura para autenticados; escrita apenas admin
create policy "pages_select_authenticated"
  on public.pages for select to authenticated
  using (true);

create policy "pages_admin_insert"
  on public.pages for insert to authenticated
  with check (public.is_admin());

create policy "pages_admin_update"
  on public.pages for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "pages_admin_delete"
  on public.pages for delete to authenticated
  using (public.is_admin());

-- user_pages: usuário lê apenas as próprias; escrita apenas admin
create policy "user_pages_select_own_or_admin"
  on public.user_pages for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "user_pages_admin_insert"
  on public.user_pages for insert to authenticated
  with check (public.is_admin());

create policy "user_pages_admin_delete"
  on public.user_pages for delete to authenticated
  using (public.is_admin());

-- Proteção em nível de coluna: o frontend (anon/authenticated) NUNCA lê embed_url.
-- A URL é entregue apenas pelo servidor (service role) via /api/embed-url.
revoke all on public.pages from anon, authenticated;
grant select (id, slug, label, icon, "order", is_active, created_at)
  on public.pages to authenticated;
