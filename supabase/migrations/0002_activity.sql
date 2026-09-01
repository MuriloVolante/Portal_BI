-- Rastreio de atividade dos usuários
-- O last_sign_in_at do Auth só muda quando a senha é digitada; com a
-- sessão persistida no navegador ele não reflete o uso real. Estas
-- estruturas registram cada abertura de dashboard via /api/embed-url.

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  page_id uuid references public.pages(id) on delete set null,
  page_label text not null,              -- denormalizado: histórico sobrevive à exclusão da página
  created_at timestamptz default now()
);

create index access_logs_user_created_idx
  on public.access_logs (user_id, created_at desc);

alter table public.access_logs enable row level security;

-- Leitura apenas para admin; escrita somente pelo servidor (service role).
create policy "access_logs_admin_select"
  on public.access_logs for select to authenticated
  using (public.is_admin());
