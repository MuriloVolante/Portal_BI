-- Auditoria da exportação do Banco de Horas (e dos testes de conexão).
-- Uma linha por tentativa: quem, quando, filtros, resultado e, em caso de
-- erro, o código do diagnóstico e o detalhe técnico.

create table if not exists public.export_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,                     -- denormalizado: sobrevive à exclusão do usuário
  action text not null check (action in ('export', 'options', 'diagnostic')),
  status text not null check (status in ('ok', 'empty', 'error', 'denied')),
  filters jsonb,
  row_count integer,
  error_code text,
  error_detail text,
  duration_ms integer,
  region text,                         -- região da Vercel que fez a conexão
  created_at timestamptz not null default now()
);

create index if not exists export_logs_created_idx on public.export_logs (created_at desc);

alter table public.export_logs enable row level security;

-- Só admin lê; ninguém escreve pelo client (o servidor grava com service role).
create policy "export_logs_admin_select"
  on public.export_logs for select to authenticated
  using (public.is_admin());
